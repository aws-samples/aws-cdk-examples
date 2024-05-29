#!/usr/bin/env python3
from aws_cdk import (
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_efs as efs,
    aws_iam as iam,
    aws_logs as logs,
    aws_ecs_patterns as ecs_patterns,
    App, Stack
)
from constructs import Construct
import os

class FargateServiceWithEfs(Stack):

    def __init__(self, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, *kwargs)

        PREFIX      = 'My'
        APP_PATH    = '/var/www/'
        VOLUME_NAME = 'ecspattern-efs-volume'

        vpc = ec2.Vpc(
            self, PREFIX+'Vpc',
            max_azs=2
        )

        cluster = ecs.Cluster(
            self, PREFIX+'Cluster',
            vpc=vpc,
        )

        # EFS File System
        file_system = efs.FileSystem(
            self, PREFIX+'EFS',
            vpc=vpc,
            lifecycle_policy=efs.LifecyclePolicy.AFTER_14_DAYS,
            performance_mode=efs.PerformanceMode.GENERAL_PURPOSE,
        )

        ap = efs.AccessPoint(
            self, PREFIX+'AccessPoint',
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

        # ECS Task Role:
        task_role = iam.Role (
            self, PREFIX+'EcsTaskRole',
            assumed_by=iam.ServicePrincipal('ecs-tasks.amazonaws.com').with_conditions({
                "StringEquals": {
                    "aws:SourceAccount": Stack.of(self).account
                },
                "ArnLike":{
                    "aws:SourceArn":"arn:aws:ecs:" + Stack.of(self).region + ":" + Stack.of(self).account + ":*"
                },
            }),
        )
        task_role.attach_inline_policy(
            iam.Policy(self, PREFIX+'Policy',
                statements=[
                    iam.PolicyStatement(
                        effect=iam.Effect.ALLOW,
                        resources=['*'],
                        actions=[
                            "ecr:GetAuthorizationToken",
                            "ec2:DescribeAvailabilityZones"
                        ]
                    ),
                    iam.PolicyStatement(
                        sid='AllowEfsAccess',
                        effect=iam.Effect.ALLOW,
                        resources=['*'],
                        actions=[
                            'elasticfilesystem:ClientRootAccess',
                            'elasticfilesystem:ClientWrite',
                            'elasticfilesystem:ClientMount',
                            'elasticfilesystem:DescribeMountTargets'
                        ]
                    )
                ]
            )
        )

        # ECS Task Definition
        task_def = ecs.FargateTaskDefinition(
            self, PREFIX+'FargateTaskDef',
            task_role=task_role,
        )

        task_def.add_volume(
            name=VOLUME_NAME,
            efs_volume_configuration=efs_volume_configuration,
        )

        mount_point = ecs.MountPoint(
            container_path=APP_PATH+VOLUME_NAME,
            source_volume=VOLUME_NAME,
            read_only=False,
        )

        port_mapping = ecs.PortMapping(
            container_port=80,
            host_port=80,
            protocol=ecs.Protocol.TCP,
        )

        container = ecs.ContainerDefinition(
            self, 'ecs-sample',
            task_definition=task_def,
            image=ecs.ContainerImage.from_registry('amazon/amazon-ecs-sample'),
            logging=ecs.LogDrivers.aws_logs(
                stream_prefix='myecs', 
                log_retention=logs.RetentionDays.ONE_MONTH,
            )
        )
        container.add_mount_points(mount_point),
        container.add_port_mappings(port_mapping),

        # ECS Patterns - Application LB Fargate Service
        fargate_service = ecs_patterns.ApplicationLoadBalancedFargateService(
            self, PREFIX+'Service',
            cluster=cluster,
            desired_count=1,
            task_definition=task_def,
            task_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS,
            ),
            platform_version=ecs.FargatePlatformVersion.LATEST,
            public_load_balancer=True,
            enable_execute_command=True,
            enable_ecs_managed_tags=True,
        )
        fargate_service.service.connections.allow_from(file_system, ec2.Port.tcp(2049)),
        fargate_service.service.connections.allow_to(file_system, ec2.Port.tcp(2049)),

        scalable_target = fargate_service.service.auto_scale_task_count(
            min_capacity=1,
            max_capacity=20,
        )

        scalable_target.scale_on_cpu_utilization("CpuScaling",
            target_utilization_percent=50,
        )

        scalable_target.scale_on_memory_utilization("MemoryScaling",
            target_utilization_percent=50,
        )

app = App()
FargateServiceWithEfs(app, "aws-fargate-service-with-efs")
app.synth()
