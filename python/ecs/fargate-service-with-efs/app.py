#!/usr/bin/env python3
from aws_cdk import (
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_efs as efs,
    aws_iam as iam,
    aws_logs as logs,
    aws_ecs_patterns as ecs_patterns,
    App, CfnOutput, Stack
)
from constructs import Construct


class FargateServiceWithEfsStack(Stack):

    def __init__(self, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, *kwargs)

        vpc = ec2.Vpc(
            self, "MyVpc",
            max_azs=2
        )

        cluster = ecs.Cluster(
            self, 'MyCluster',
            vpc=vpc,
        )

        file_system = efs.FileSystem(
            self, 'MyEFS',
            vpc=vpc,
            lifecycle_policy=efs.LifecyclePolicy.AFTER_14_DAYS,
            performance_mode=efs.PerformanceMode.GENERAL_PURPOSE,
        )

        ap = efs.AccessPoint(
            self, 'MyAccessPoint',
            file_system=file_system,
        )

        efs_volume_configuration = ecs.EfsVolumeConfiguration(
            file_system_id=file_system.file_system_id,

            # the properties below are optional
            authorization_config=ecs.AuthorizationConfig(
                access_point_id=ap.access_point_id,
                iam='ENABLED',
            ),
            transit_encryption='ENABLED',
        )

        # Role:
        task_role = iam.Role (
            self, 'EcsTaskRole',
            assumed_by=iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
        )
        task_role.add_to_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                resources=['*'],
                actions=[
                    "ecr:GetAuthorizationToken",
                    "ec2:DescribeAvailabilityZones",
                    "logs:CreateLogStream",
                    "logs:DescribeLogGroups",
                    "logs:DescribeLogStreams",
                    "logs:PutLogEvents",
                    "ssmmessages:CreateControlChannel",
                    "ssmmessages:CreateDataChannel",
                    "ssmmessages:OpenControlChannel",
                    "ssmmessages:OpenDataChannel",
                ]
            )
        )
        task_role.add_to_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                resources=['*'],
                actions=[
                    'elasticfilesystem:ClientRootAccess',
                    'elasticfilesystem:ClientWrite',
                    'elasticfilesystem:ClientMount',
                    'elasticfilesystem:DescribeMountTargets'
                ]
            )
        )

        task_def = ecs.FargateTaskDefinition(
            self, 'MyFargateTaskDef',
            task_role=task_role,
        )

        container = ecs.ContainerDefinition(
            self, 'ecs-sample',
            task_definition=task_def,
            image=ecs.ContainerImage.from_registry("amazon/amazon-ecs-sample"),
            logging=ecs.LogDrivers.aws_logs(
                stream_prefix='myecs', 
                log_retention=logs.RetentionDays.ONE_MONTH,
            )
        )

app = App()
FargateServiceWithEfsStack(app, "FargateECSServiceWithEfs")
app.synth()
