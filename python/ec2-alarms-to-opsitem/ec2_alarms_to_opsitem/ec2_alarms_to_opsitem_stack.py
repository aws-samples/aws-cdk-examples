import os.path
import json
import re

from aws_cdk import (
    Aws,
    Tags,
    Duration,
    Stack,
    aws_iam as iam_,
    aws_ssm as ssm_,
    aws_sns as sns_,
    aws_sns_subscriptions as Subscriptions,
    aws_ec2 as ec2,
    CfnParameter,
    aws_lambda as lambda_,
    aws_events as events,
    aws_events_targets as targets,
    aws_s3_assets as asset
    # aws_sqs as sqs,
)
from constructs import Construct

dirname = os.path.dirname(__file__)
account_id = Aws.ACCOUNT_ID
region = Aws.REGION

class Ec2AlarmsToOpsitemStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        f = open('./ec2_alarms_to_opsitem/ssm_content.json')
        data = json.load(f)

        ssm_.CfnDocument(
          self, 'ssmdoc',
          content=data,
          document_type="Command",
          name="Koi-TriggerAlarm",
        )

        koitopic = sns_.Topic(self, "Topic",
            display_name="koi-demo-topic",
        )

        email = CfnParameter(self, "emailparam", type="String",
            description="Email to receive notifications",
        )
        koitopic.add_subscription(Subscriptions.EmailSubscription(email.value_as_string))

        y_lambda_role = iam_.Role(self, "LambdaRole",
           assumed_by=iam_.ServicePrincipal("lambda.amazonaws.com")
        )
        y_lambda_role.add_managed_policy(iam_.ManagedPolicy.from_aws_managed_policy_name("service-role/AWSLambdaBasicExecutionRole"))
        y_lambda_role.add_to_policy(
            iam_.PolicyStatement(
                effect = iam_.Effect.ALLOW,
                resources=["*"],
                actions=["kms:Decrypt",
                    "cloudwatch:SetAlarmState","ssm:CreateOpsItem",
                    "ssm:AddTagsToResource",
                    "ec2:CreateTags","ec2:DescribeInstances",
                    "cloudwatch:PutMetricAlarm","cloudwatch:DeleteAlarms",
                    "cloudwatch:DescribeAlarms","sns:Publish"]
            )    
        )

        # create lambda function
        my_alarm = lambda_.Function(
            self, 'AlarmHandler',
            runtime= lambda_.Runtime.PYTHON_3_9,
            #code= lambda.Code.asset('lambda',),
            code = lambda_.Code.from_asset('lambda', exclude=['opsitem.py']),
            handler= 'alarm.handler',
            timeout=Duration.seconds(60),
            role = y_lambda_role,
            environment={
                'acct': account_id,
                'region': region,
                'topic':koitopic.topic_name
            }
        )

        pattern = events.EventPattern(
            source=['aws.ec2'],
            detail_type=["EC2 Instance State-change Notification"],
            detail={"state":["running"]}
        )

        target1 = targets.LambdaFunction(handler=my_alarm)

        rule = events.Rule(self, id='createAlarm', 
            description='Detect Running EC2', 
            event_pattern=pattern,
            targets=[target1],
        )

        my_opsitem = lambda_.Function(
            self, 'OpsItemHandler',
            runtime= lambda_.Runtime.PYTHON_3_7,
            code= lambda_.Code.from_asset('lambda',exclude=['alarm.py']),
            handler= 'opsitem.handler',
            timeout=Duration.seconds(60),
            role = y_lambda_role,
            environment={
                'acct': account_id,
                'region':region,
                'topic':koitopic.topic_name
            }
        )

        pattern2 = events.EventPattern(
            source=["aws.cloudwatch"],
            detail_type=["CloudWatch Alarm State Change"],
            detail={
                "alarmName":[{"prefix":"StatusCheckFailed-"}],
                "state":{"value":["ALARM"]}
            }
        )

        target2 = targets.LambdaFunction(handler=my_opsitem)

        rule2 = events.Rule(self, id='createOpsItem', 
            description='Detect StatusCheckFailed Alarm State', 
            event_pattern=pattern2,
            targets=[target2],
        )

        #define AMI properties
        amzn_linux = ec2.MachineImage.latest_amazon_linux(
            generation=ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
            edition=ec2.AmazonLinuxEdition.STANDARD,
            virtualization=ec2.AmazonLinuxVirt.HVM,
            storage=ec2.AmazonLinuxStorage.GENERAL_PURPOSE
        )
        
        # Instance Role and SSM Managed Policy
        role = iam_.Role(self, "InstanceSSM", assumed_by=iam_.ServicePrincipal("ec2.amazonaws.com"))
        role.add_managed_policy(iam_.ManagedPolicy.from_aws_managed_policy_name("AmazonSSMManagedInstanceCore"))
        role.add_to_policy(
            iam_.PolicyStatement(
                effect = iam_.Effect.ALLOW,
                resources=["*"],
                actions=["kms:Decrypt","cloudwatch:SetAlarmState"]
                )    
        )

        #vpc = ec2.Vpc.from_lookup(
        #    self, "VPC",
        #    is_default=True,
        #    region=region)
        
        vpc = ec2.Vpc(
            self,"LabVpc",
            cidr="10.10.0.0/24"
        )

        #Instance
        instance = ec2.Instance(self,
            "Instance", 
            instance_type=ec2.InstanceType("t3.nano"),
            machine_image=amzn_linux,
            vpc = vpc,
            role=role,
            vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PUBLIC),
        )

        Tags.of(instance).add("OpsItemAlarm","false")

        #s3asset = asset(self, "Asset", path=os.path.join(dirname, "configure.sh"))
        s3asset = asset.Asset(
            self, "Asset",
            path=os.path.join(dirname, "configure.sh")
        )

        local_path = instance.user_data.add_s3_download_command(
            bucket=s3asset.bucket,
            bucket_key=s3asset.s3_object_key
        )

        instance.user_data.add_execute_file_command(
            file_path=local_path
        )
        s3asset.grant_read(instance.role)
