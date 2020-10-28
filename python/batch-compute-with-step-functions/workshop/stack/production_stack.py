from aws_cdk import (
    aws_stepfunctions as _sfn,
    aws_stepfunctions_tasks as _sfn_tasks,
    aws_ec2 as _ec2,
    aws_s3 as _s3,
    aws_iam as _iam,
    aws_apigateway as _apigateway,
    core,
)
from construct.production.batch_env import BatchENV
from construct.production.stepfunctions_env import StepfunctionsENV
from construct.production.sns_env import SnsENV
from construct.production.batch_task import BatchTASK
from construct.production.lambda_task import LambdaTask
from construct.production.ecr_env import EcrENV

class ProductionStack(core.Stack):
    def getStateMachine(self):
        return self.My_SFN.statemachine
        
    def getEcrRepo(self):
        return self.My_ECR_Repo
        
    def getVpc(self):
        return self.My_Vpc

    def __init__(self, scope: core.Construct, id: str,UserName="default",EmailAddress="default",**kwargs) -> None:
        super().__init__(scope, id, **kwargs)
        
        # vpc with one public subnet and one private subnet
        self.My_Vpc = _ec2.Vpc(self, "vpc-"+ UserName + "-batch",
            max_azs=2,
            nat_gateways=1,
            subnet_configuration=[
                _ec2.SubnetConfiguration(
                    subnet_type=_ec2.SubnetType.PUBLIC,
                    name="BatchENV",
                    cidr_mask=24
                ),
                _ec2.SubnetConfiguration(
                    cidr_mask=24,
                    name="InternalENV",
                    subnet_type=_ec2.SubnetType.PRIVATE
                )
            ]
        )
        
        # Definition Of S3 Bucket For Batch Computing
        self.My_S3_Bucket = _s3.Bucket(self,
            "s3bucket-" + UserName + "-batch",
            lifecycle_rules=[
                _s3.LifecycleRule(
                    # delete the files after 1800 days (5 years)
                    expiration=core.Duration.days(365),
                    transitions=[
                        # move files into glacier after 90 days
                        _s3.Transition(
                            transition_after=core.Duration.days(30),
                            storage_class=_s3.StorageClass.GLACIER
                        ),
                        _s3.Transition(
                            transition_after=core.Duration.days(120),
                            storage_class=_s3.StorageClass.DEEP_ARCHIVE
                        )
                    ],
                )
            ],
            removal_policy=core.RemovalPolicy.DESTROY
        )
        
        # Definition Of ECR Repo
        self.My_ECR_Repo = EcrENV(self,
            "ecr-" + UserName + "-batch",
            UserName=UserName
        )
        
        # Definition Of Batch ENV For Batch Computing
        self.My_Batch = BatchENV(self,
            "env-" + UserName + "-batch",
            CurrentVPC=self.My_Vpc,
            TargetS3=self.My_S3_Bucket,
            UserName=UserName
            
        )
        
        # Definition Of Batch Job 
        self.My_Batch_Task = BatchTASK(self,
            "task-" + UserName + "-batch",
            EcrRepo=self.My_ECR_Repo,
            UserName=UserName
        )
        
        # Definition Of Lambda Job 
        self.My_Lambda_Task = LambdaTask(self,
            "task-" + UserName + "-lambda",
            TargetS3=self.My_S3_Bucket
        )
        
        # Definition Of SNS Topic With Subscription 
        self.My_SNS = SnsENV(self,
            "sns-" + UserName + "-sfn",
            UserName=UserName,
            EmailAddress=EmailAddress
        )
        
        # Definition Of State Machine In Step functions  
        self.My_SFN = StepfunctionsENV(self,
            "statemachine-" + UserName + "-sfn",
            QueueDefine = self.My_Batch,
            TaskDefine = self.My_Batch_Task,
            LambdaDefine = self.My_Lambda_Task,
            SNSDefine = self.My_SNS
        )
        
        core.CfnOutput(self,
            "S3 Bucket For AWS Batch",
            value = self.My_S3_Bucket.bucket_name
        )