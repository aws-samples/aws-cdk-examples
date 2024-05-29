from constructs import Construct
from aws_cdk import (
    Duration, Stack,
    aws_iam as iam,
    aws_ecs as ecs,
    aws_ecs_patterns as ecs_patterns,
    aws_efs as efs,
    aws_ec2 as ec2
)

class FargateServiceWithEfsStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        vpc = ec2.Vpc(
            self, 'Vpc', 
            max_azs = 2
        )
        
        ecsCluster = ecs.Cluster(
            self, 'EcsCluster',
            vpc = vpc 
        )

        fileSystem = efs.FileSystem(
            self, 'MyEfsFileSystem', 
            vpc = vpc,
            encrypted = True,
            lifecycle_policy = efs.LifecyclePolicy.AFTER_14_DAYS,
            performance_mode = efs.PerformanceMode.GENERAL_PURPOSE,
            throughput_mode = efs.ThroughputMode.BURSTING,
        )

        fileSystem.add_to_resource_policy(
            iam.PolicyStatement(
                actions = ['elasticfilesystem:ClientMount'],
                principals = [iam.AnyPrincipal()],
                conditions = { 
                     'Bool' : {'elasticfilesystem:AccessedViaMountTarget':'true' }
                }
            )
        )

        taskDefinition = ecs.FargateTaskDefinition(
            self, 'MyTaskDefinition', 
            memory_limit_mib = 512,
            cpu = 256,
        )
        
        taskDefinition.add_volume(
            name = 'uploads',
            efs_volume_configuration = ecs.EfsVolumeConfiguration(
                file_system_id = fileSystem.file_system_id
            )
        )

        containerDefinition = ecs.ContainerDefinition(
            self, 'MyContainerDefinition',
            image = ecs.ContainerImage.from_registry('coderaiser/cloudcmd'),
            task_definition = taskDefinition,
        
        )

        containerDefinition.add_mount_points(
            ecs.MountPoint( 
                source_volume = 'uploads',
                container_path = '/uploads',
                read_only = False,
            )
        )

        containerDefinition.add_port_mappings(
            ecs.PortMapping(container_port = 8000)
        )

        albFargateService = ecs_patterns.ApplicationLoadBalancedFargateService(
            self, 'Service01',
            cluster = ecsCluster,
            task_definition = taskDefinition,
            desired_count = 2,
            
        )

        albFargateService.target_group.set_attribute('deregistration_delay.timeout_seconds', '30')

        #  Allow access to EFS from Fargate ECS
        fileSystem.grant_root_access(albFargateService.task_definition.task_role.grant_principal)
        fileSystem.connections.allow_default_port_from(albFargateService.service.connections)