import os.path
import json

from aws_cdk import core as cdk
from aws_cdk.aws_s3_assets import Asset
import aws_cdk.aws_lambda as _lambda
import aws_cdk.aws_events as events
import aws_cdk.aws_events_targets as targets
import aws_cdk.aws_ec2 as ec2
import aws_cdk.aws_iam as iam
import aws_cdk.aws_ssm as ssm
import aws_cdk.aws_sns as sns
import aws_cdk.aws_sns_subscriptions as subscriptions

dirname = os.path.dirname(__file__)

class KoiStack(cdk.Stack):

    def __init__(self, scope: cdk.Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        f = open('./koi/ssm_content.json')
        data = json.load(f)

        ssm.CfnDocument(
          self, 'ssmdoc',
          content=data,
          document_type="Command",
          name="Koi-TriggerAlarm",
        )

        koitopic = sns.Topic(self, "Topic",
            display_name="koi-demo-topic",
        )

        email = cdk.CfnParameter(self, "emailparam", type="String",
            description="Email to receive notifications",
        )
        koitopic.add_subscription(subscriptions.EmailSubscription(email.value_as_string))

        y_lambda_role = iam.Role(self, "LambdaRole",
           assumed_by=iam.ServicePrincipal("lambda.amazonaws.com")
        )
        y_lambda_role.add_managed_policy(iam.ManagedPolicy.from_aws_managed_policy_name("service-role/AWSLambdaBasicExecutionRole"))
        y_lambda_role.add_to_policy(
            iam.PolicyStatement(
                effect = iam.Effect.ALLOW,
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
        my_alarm = _lambda.Function(
            self, 'AlarmHandler',
            runtime= _lambda.Runtime.PYTHON_3_7,
            #code= _lambda.Code.asset('lambda',),
            code = _lambda.Code.from_asset('lambda', exclude=['opsitem.py']),
            handler= 'alarm.handler',
            timeout=cdk.Duration.seconds(60),
            role = y_lambda_role,
            environment={
                'acct':self.node.try_get_context("acct_context"),
                'region':self.node.try_get_context("region_context"),
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

        my_opsitem = _lambda.Function(
            self, 'OpsItemHandler',
            runtime= _lambda.Runtime.PYTHON_3_7,
            code= _lambda.Code.from_asset('lambda',exclude=['alarm.py']),
            handler= 'opsitem.handler',
            timeout=cdk.Duration.seconds(60),
            role = y_lambda_role,
            environment={
                'acct':self.node.try_get_context("acct_context"),
                'region':self.node.try_get_context("region_context"),
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
        role = iam.Role(self, "InstanceSSM", assumed_by=iam.ServicePrincipal("ec2.amazonaws.com"))
        role.add_managed_policy(iam.ManagedPolicy.from_aws_managed_policy_name("AmazonSSMManagedInstanceCore"))
        role.add_to_policy(
            iam.PolicyStatement(
                effect = iam.Effect.ALLOW,
                resources=["*"],
                actions=["kms:Decrypt","cloudwatch:SetAlarmState"]
                )    
        )

        vpc = ec2.Vpc.from_lookup(
            self, "VPC",
            is_default=True,)
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
            
        s3asset = Asset(self, "Asset", path=os.path.join(dirname, "configure.sh"))
        
        local_path = instance.user_data.add_s3_download_command(
            bucket=s3asset.bucket,
            bucket_key=s3asset.s3_object_key
        )

        instance.user_data.add_execute_file_command(
            file_path=local_path
        )
        s3asset.grant_read(instance.role)

