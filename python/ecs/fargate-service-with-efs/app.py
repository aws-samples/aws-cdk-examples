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

        PREFIX      = 'efs-sample-'
        APP_PATH    = '/var/www/'
        VOLUME_NAME = 'cdk-ecs-sample-efs-volume'

        vpc = ec2.Vpc(
            self, PREFIX + 'Vpc',
            max_azs=2
        )

        ecs_cluster = ecs.Cluster(
            self, PREFIX + 'Cluster',
            vpc=vpc,
        )

        # Create an Amazon Elastic File System (EFS), with the logical ID CDK-efs-sample-EFS
        file_system = efs.FileSystem(
            self, PREFIX + 'EFS',
            vpc=vpc,
            lifecycle_policy=efs.LifecyclePolicy.AFTER_14_DAYS,
            performance_mode=efs.PerformanceMode.GENERAL_PURPOSE,
        )

        # Create an Access Point for the EFS, with the logical ID CDK-efs-sample-AccessPoint
        access_point = efs.AccessPoint(
            self, PREFIX + 'AccessPoint',
            file_system=file_system,
        )

        # Create a new EFS volume configuration for the ECS Task
        efs_volume_configuration = ecs.EfsVolumeConfiguration(
            file_system_id=file_system.file_system_id,

            # The logical ID of the Access Point to use.
            # This is a string, not an ARN.
            authorization_config=ecs.AuthorizationConfig(
                access_point_id=access_point.access_point_id,
                iam='ENABLED',
            ),
            transit_encryption='ENABLED',
        )

        # Create a new IAM Role for the ECS Task
        task_role = iam.Role (
            self, PREFIX + 'EcsTaskRole',
            assumed_by=iam.ServicePrincipal('ecs-tasks.amazonaws.com').with_conditions({
                "StringEquals": {
                    "aws:SourceAccount": Stack.of(self).account
                },
                "ArnLike":{
                    "aws:SourceArn":"arn:aws:ecs:" + Stack.of(self).region + ":" + Stack.of(self).account + ":*"
                },
            }),
        )

        # Attach a managed policy to the IAM Role
        task_role.attach_inline_policy(
            iam.Policy(self, PREFIX +'Policy',
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

        # Create a new Fargate Task Definition
        task_definition = ecs.FargateTaskDefinition(
            self, PREFIX + 'FargateTaskDef',
            task_role=task_role,
        )

        # Add a new volume to the Fargate Task Definition
        task_definition.add_volume(
            name=VOLUME_NAME,
            efs_volume_configuration=efs_volume_configuration,
        )

        # Add a new container to the Fargate Task Definition
        mount_point = ecs.MountPoint(
            container_path=APP_PATH+VOLUME_NAME,
            source_volume=VOLUME_NAME,
            read_only=False,
        )

        # Add a new port mapping to the Fargate Task Definition
        port_mapping = ecs.PortMapping(
            container_port=80,
            host_port=80,
            protocol=ecs.Protocol.TCP,
        )

        # Add a new container to the Fargate Task Definition
        container = ecs.ContainerDefinition(
            self, 'ecs-cdk-sample-container',
            task_definition=task_definition,
            image=ecs.ContainerImage.from_registry('amazon/amazon-ecs-sample'),
            logging=ecs.LogDrivers.aws_logs(
                stream_prefix='cdk-ecs-sample', 
                log_retention=logs.RetentionDays.ONE_MONTH,
            )
        )

        # Add a new volume to the Fargate Task Definition
        container.add_mount_points(mount_point),

        # Add a new port mapping to the Fargate Task Definition
        container.add_port_mappings(port_mapping),

        # Create a new Fargate Service with ALB
        fargate_service = ecs_patterns.ApplicationLoadBalancedFargateService(
            self, PREFIX + 'Service',
            cluster=ecs_cluster,
            desired_count=1,
            task_definition=task_definition,
            task_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS,
            ),
            platform_version=ecs.FargatePlatformVersion.LATEST,
            public_load_balancer=True,
            enable_execute_command=True,
            enable_ecs_managed_tags=True,

        )

        # Allow the ECS Service to connect to the EFS
        fargate_service.service.connections.allow_from(file_system, ec2.Port.tcp(2049)),

        # Allow the EFS to connect to the ECS Service
        fargate_service.service.connections.allow_to(file_system, ec2.Port.tcp(2049)),

        # Create a new Auto Scaling Policy for the ECS Service
        scalable_target = fargate_service.service.auto_scale_task_count(
            min_capacity=1,
            max_capacity=20,
        )

        # Create a new Auto Scaling Policy for the ECS Service
        scalable_target.scale_on_cpu_utilization("CpuScaling",
            target_utilization_percent=50,
        )

        # Create a new Auto Scaling Policy for the ECS Service
        scalable_target.scale_on_memory_utilization("MemoryScaling",
            target_utilization_percent=50,
        )

# Create the new CDK Application
cdk_application = App()
FargateServiceWithEfs(cdk_application, "aws-fargate-service-with-efs")
cdk_application.synth()
