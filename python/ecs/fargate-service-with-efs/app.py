from aws_cdk import (
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_efs as efs,
    aws_iam as iam,
    aws_ecs_patterns as ecs_patterns,
    App, CfnOutput, Duration, Stack
)
from constructs import Construct
class FargateEfs(Stack):

    def __init__(self, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        #VPC
        # Create VPC with 2 AZ and a Fargate Cluster
        my_fargate_vpc = ec2.Vpc(
            self, "my_fargate_vpc",
            max_azs=2
        )

        # EFS
        # File System Policy
        my_file_system_policy = iam.PolicyDocument(
            statements=[iam.PolicyStatement(
                actions=["elasticfilesystem:ClientMount"],
                principals=[iam.AnyPrincipal()],
                resources=["*"],
                conditions={
                    "Bool": {
                    "elasticfilesystem:AccessedViaMountTarget": "true"
                    }
                }
            )]
        )

        # Create EFS in MyFargateVpc
        my_file_system = efs.FileSystem(self, "my_fargate_file_system",
            vpc=my_fargate_vpc,
            encrypted=True,
            file_system_policy=my_file_system_policy,
            lifecycle_policy=efs.LifecyclePolicy.AFTER_14_DAYS,
            performance_mode=efs.PerformanceMode.GENERAL_PURPOSE,
            throughput_mode=efs.ThroughputMode.BURSTING,
        )

        # Create an access point for the file system
        access_point = my_file_system.add_access_point(
            "MyAccessPoint",
            path="/uploads"
        )

        # Output the access point ID and ARN

        CfnOutput(
            self, "AccessPointId",
            value=access_point.access_point_id,
            description="Access Point ID"
        )

        CfnOutput(
            self, "AccessPointArn",
            value=access_point.access_point_arn,
            description="Access Point ARN"
        )

        # ECS

        # Task Definition
        task_definition = ecs.FargateTaskDefinition(self, "MyTaskDefinition")

        # Permissions
        my_task_role = iam.Role(self, "TaskRole", assumed_by=iam.ServicePrincipal("ecs-tasks.amazonaws.com")) 
        my_task_execution_role = iam.Role(self, "TaskExecutionRole", assumed_by=iam.ServicePrincipal("ecs-tasks.amazonaws.com"))
        my_file_system.grant_root_access(my_task_execution_role)

        # Add container to the task definition
        container = task_definition.add_container(
            "WebContainer",
            image=ecs.ContainerImage.from_registry("coderaiser/cloudcmd"),
            port_mappings=[
                ecs.PortMapping(container_port=8000)
                ],
            memory_limit_mib=512,
            cpu=1,
        )
        
        # ECS cluster
        cluster = ecs.Cluster(
            self, "ECS-EFS-Cluster",
            vpc=my_fargate_vpc,
            cluster_name="my_ecs_fargate_efs_cluster"
        )

        # Create a Fargate service with application load balanced fargte
        fargate_service = ecs_patterns.ApplicationLoadBalancedFargateService(
            self, "MyFargateService",
            cluster=cluster,
            task_definition=task_definition,
            desired_count=2,
            task_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS),
            assign_public_ip=False,
            platform_version=ecs.FargatePlatformVersion.VERSION1_4
        )

        # Mount the EFS filesystem to the fargate service
        fargate_service.service.task_definition.default_container.add_mount_points(
            ecs.MountPoint(
                container_path="/uploads",
                source_volume="uploads",
                read_only=False
            )
        )


        # Output the DNS name of the load balancer
        # CfnOutput(
        #     self, "LoadBalancerDNS",
        #     value=fargate_service.load_balancer.load_balancer_dns_name,
        #     description="DNS of the load balancer"
        # )


app = App()
FargateEfs(app, "aws-fargate-application-autoscaling")
app.synth()
