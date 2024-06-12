from aws_cdk import (
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_efs as efs,
    aws_iam as iam,
    aws_ecs_patterns as ecs_patterns,
    App, CfnOutput, Duration, Stack
)
from constructs import Construct
class FargateEFS(Stack):

    def __init__(self, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # Create VPC with 2 AZ and a Fargate Cluster
        vpc = ec2.Vpc(
            self, "MyFargateVpc",
            max_azs=2
        )

        # File System Policy
        my_file_system_policy = iam.PolicyDocument(
            statements=[iam.PolicyStatement(
                actions=["elasticfilesystem:ClientMount"],
                principals=[iam.AccountRootPrincipal()],
                resources=["*"],
                conditions={
                    "Bool": {
                    "elasticfilesystem:AccessedViaMountTarget": "true"
                    }
                }
            )]
        )

        # Create EFS
        my_file_system = efs.FileSystem(self, "My_Fargate_File_System",
            vpc=vpc,
            encrypted=True,
            file_system_policy=my_file_system_policy,
            lifecycle_policy=efs.LifecyclePolicy.AFTER_14_DAYS,
            performance_mode=efs.PerformanceMode.GENERAL_PURPOSE,
            throughput_mode=efs.ThroughputMode.BURSTING,
        )
        
        # Create Access point
        my_file_system.add_access_point("AccessPoint", "path=/uploads")        
        