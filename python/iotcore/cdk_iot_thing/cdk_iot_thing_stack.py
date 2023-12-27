import os


from aws_cdk import (
    Stack,
    aws_logs as logs,
    aws_iot as iot,
    aws_iam as iam,
    aws_lambda as _lambda,
    custom_resources as CustomResourceProvider,
    CustomResource,
    Duration,
    Aws
)

from constructs import Construct

class CdkIotThingStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        
        # Environment variables
        account=Aws.ACCOUNT_ID
        region=Aws.REGION
        iot_thing_name="CdkThing001"

        # Create an IoT Thing
        cfn_thing=iot.CfnThing(self, "MyCdkThing",
            thing_name=iot_thing_name
        )
        
        # Lambda role for creating certs and keys
        lambda_role = iam.Role(self, f"{iot_thing_name}LambdaRole", 
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com")
        )
    
        lambda_role.add_to_policy(
            iam.PolicyStatement(
                actions=["secretsmanager:CreateSecret","secretsmanager:DeleteSecret"],
                resources=["arn:aws:secretsmanager:*:*:secret:*"]
            )
        )
        
        lambda_role.add_to_policy(
            iam.PolicyStatement(
                actions=["iot:CreateKeysAndCertificate", "iot:UpdateCertificate"],
                resources=["*"]
            )
        )
        
        
        # Custom Lambda to create IoT certificate and storing in secrets manager
        cert_lambda = _lambda.Function(
            self,"CertHandler",
            function_name="CertHandlerFunction",
            runtime=_lambda.Runtime.PYTHON_3_11,
            code=_lambda.Code.from_asset("lambda"),
            handler="cert_handler.lambda_handler",
            role=lambda_role,
            log_retention=logs.RetentionDays.ONE_DAY,
            timeout=Duration.seconds(60)
        )

        provider = CustomResourceProvider.Provider(
            self,'IoTCertProvider',
            on_event_handler= cert_lambda
        )
        
        certificate = CustomResource(
            self, "IoTCertCustomResource",
            service_token=provider.service_token
        )        
        
        # Create a policy of the certificate
        cfn_policy = iot.CfnPolicy(self, "CfnPolicy",
            policy_document={
                "Version":"2012-10-17",
                "Statement":[
                    {
                        "Effect":"Allow",
                        "Action":[
                            "iot:Connect"
                        ],
                        "Resource":[
                            f"arn:aws:iot:"+region+":"+account+":client/"+iot_thing_name
                            ]
                    },
                    {
                        "Effect": "Allow",
                        "Action": [
                            "iot:Publish"
                        ],
                        "Resource":[f"arn:aws:iot:"+region+":"+account+":topic/*"]
                    }
                ]
            },
        policy_name=f"{iot_thing_name}IoTCertPolicy"
        )
        
        # Connect the certificate and policy
        policy_attchment = iot.CfnPolicyPrincipalAttachment(
            self,
            id=iot_thing_name+"PolicyPrincipalAttachment",
            policy_name=iot_thing_name+"IoTCertPolicy",
            principal=f"arn:aws:iot:{region}:{account}:cert/{certificate.get_att_string('certificateId')}"
        )

        # Connect the IoT thing and certificate
        principal_attchmnt = iot.CfnThingPrincipalAttachment(
            self,
            id=iot_thing_name+"ThingPrincipalAttachment",
            principal=f"arn:aws:iot:{region}:{account}:cert/{certificate.get_att_string('certificateId')}",
            thing_name=iot_thing_name
        )

        
        iam_role_name="CdkIoTCoreCloudWatchAccessRole"
       
        # Create an IAM role for logging the IoT rule event
        cfn_role=iam.CfnRole(self, "CfnRole",
            assume_role_policy_document=iam.PolicyDocument(
                statements=[iam.PolicyStatement(
                    actions=["sts:AssumeRole"],
                    effect=iam.Effect.ALLOW,
                    principals=[iam.ServicePrincipal("iot.amazonaws.com")]
                )]
            ),
            description="CDK created role for logging IoT rule event",
            role_name=iam_role_name,
            policies=[iam.CfnRole.PolicyProperty(
                policy_document=iam.PolicyDocument(
                    statements=[iam.PolicyStatement(
                        actions=["logs:CreateLogStream",
                                 "logs:DescribeLogStreams",
                                 "logs:PutLogEvents"],
                        effect=iam.Effect.ALLOW,
                        resources=["*"]
                    )]
                ),
                policy_name="CdkIoTCoreCloudWatchAccessPolicy"
            )]
        )
        
        
        # Configure log group for short retention
        logGroupName="CdkThing001LogGroup"
        cfn_log_group=logs.CfnLogGroup(self, "CfnLogGroup",
            log_group_name=logGroupName,
            retention_in_days=7
            ##apply_removal_policy=True
        )
        
        # IoT Rule with SQL. The rule action to send data to Amazon CloudWatch Logs.
        iot_topic_rule_sql="SELECT color AS rgb FROM 'device/color' WHERE temperature > 50"
 
        iot_topic_rule=iot.CfnTopicRule(
            self, "CdkIoTCoreRule",
            topic_rule_payload=iot.CfnTopicRule.TopicRulePayloadProperty(
                sql=iot_topic_rule_sql,
                actions=[iot.CfnTopicRule.ActionProperty(
                cloudwatch_logs=iot.CfnTopicRule.CloudwatchLogsActionProperty(
                    log_group_name=logGroupName,
                    role_arn=cfn_role.attr_arn,
                    # the properties below are optional
                    batch_mode=False
                ))]
            )
        )