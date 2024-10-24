from aws_cdk import (
    NestedStack,
    aws_ec2 as ec2,
    aws_servicediscovery as servicediscovery,
    aws_ecs as ecs,
    Duration,
    aws_logs as logs,
    aws_iam as iam,
    aws_iam as iam,
    aws_ecr_assets as ecr_assets,
    aws_elasticloadbalancingv2 as elbv2,
    RemovalPolicy,
    CfnOutput

)
from constructs import Construct

class EcsStack(NestedStack):

    def __init__(self, scope: Construct, construct_id: str, vpc: ec2.Vpc, frontend_repository: ecr_assets.DockerImageAsset, backend_data_repository: ecr_assets.DockerImageAsset, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        # Creating the ECS Cluster and the cloud map namespace
        ecs_cluster = ecs.Cluster(self, "ECSCluster",
                                  vpc=vpc,
                                  cluster_name="App-Service-Connect-Cluster",
                                  container_insights=True)
        default_cloud_map_namespace=ecs_cluster.add_default_cloud_map_namespace(name="scapp.local", use_for_service_connect=True, type=servicediscovery.NamespaceType.DNS_PRIVATE)
        # Creating the Cloudwatch log group where ECS Logs will be stored 
        ECSServiceLogGroup = logs.LogGroup(self, "ECSServiceLogGroup",
                                           log_group_name=f"{ecs_cluster.cluster_name}-service",
                                           removal_policy=RemovalPolicy.DESTROY,
                                           retention=logs.RetentionDays.FIVE_DAYS,
                                           )
        # Creating the task and execution IAM roles that the containers will assume to read and write to cloudwatch, Task Execution
        # Role will read from ECR
        ECSTaskIamRole = iam.Role(self, "ECSTaskIamRole",
                                   assumed_by=iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
                                   managed_policies=[
                                       iam.ManagedPolicy.from_aws_managed_policy_name("CloudWatchFullAccess"),
                                   ],
                                   )
        TaskExecutionRole = iam.Role(self, "TaskexecutionRole",
                                      assumed_by=iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
                                      managed_policies=[
                                          iam.ManagedPolicy.from_aws_managed_policy_name("AmazonEC2ContainerRegistryReadOnly"),
                                          iam.ManagedPolicy.from_aws_managed_policy_name("CloudWatchLogsFullAccess"),
                                      ],
                                      )
        # ECS Security group, this will allow access from the Load Balancer and allow LAN access so that the 
        # ECS containers can talk to eachother on port 5001 (which is the port that the backend uses)
        ECSSecurityGroup = ec2.SecurityGroup(self, "ECSSecurityGroup",
                                              vpc=vpc,
                                              description="ECS Security Group",
                                              allow_all_outbound=True,
                                              )
        ECSSecurityGroup.add_ingress_rule(ec2.Peer.ipv4(vpc.vpc_cidr_block), ec2.Port.tcp(5001), description="All traffic within VPC",)
        # Task definitions for the frontend and backend
        frontend_definition = ecs.FargateTaskDefinition(
            self, f"FrontendTaskDefinition",
            family="frontend",
            cpu=256,
            memory_limit_mib=512,
            task_role=TaskExecutionRole,
            execution_role=ECSTaskIamRole
        )
        backend_definition = ecs.FargateTaskDefinition(
            self, f"BackendTaskDefinition",
            family="backend",
            cpu=256,
            memory_limit_mib=512,
            task_role=TaskExecutionRole,
            execution_role=ECSTaskIamRole
        )

        # Containers for each application, when the frontend is hit on /get-data it makes a call to the backend endpoint /data
        frontend_container = frontend_definition.add_container("FrontendContainer",
                                            container_name="frontend-app",
                                            image=ecs.ContainerImage.from_docker_image_asset(frontend_repository),
                                            port_mappings=[
                                                ecs.PortMapping(
                                                    container_port=5000,  # Flask app is running on 5001
                                                    host_port=5000,
                                                    name="frontend"  # Name of the port mapping
                                                )
                                            ],
                                            logging=ecs.LogDriver.aws_logs(stream_prefix="ecs-logs"))
        backend_container = backend_definition.add_container("BackendContainer",
                                            image=ecs.ContainerImage.from_docker_image_asset(backend_data_repository),
                                            port_mappings=[
                                                ecs.PortMapping(
                                                    container_port=5001,  # Flask app is running on 5001
                                                    host_port=5001,
                                                    name="data"  # Name of the port mapping
                                                    
                                                )
                                            ],
                                            container_name="backend",
                                            logging=ecs.LogDriver.aws_logs(stream_prefix="ecs-logs"))
        # Creating the service definitions and port mappings
        frontend_service = ecs.FargateService(self, "FrontendService",
                                    cluster=ecs_cluster,
                                    task_definition=frontend_definition,
                                    desired_count=1,
                                    max_healthy_percent=200,
                                    min_healthy_percent=100,
                                    vpc_subnets=ec2.SubnetSelection(one_per_az=True, subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS),
                                    security_groups=[ECSSecurityGroup],
                                    service_connect_configuration=ecs.ServiceConnectProps(
                                    namespace=default_cloud_map_namespace.namespace_name,
                                    services=[ecs.ServiceConnectService(
                                        port_mapping_name="frontend",  # Logical name for the service
                                        port=5000,  # Container port
                                    )]),
                                    service_name="frontend-service")
        backend_service = ecs.FargateService(self, "BackendService",
                                    cluster=ecs_cluster,
                                    task_definition=backend_definition,
                                    desired_count=1,
                                    max_healthy_percent=200,
                                    min_healthy_percent=100,
                                    vpc_subnets=ec2.SubnetSelection(one_per_az=True, subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS),
                                    security_groups=[ECSSecurityGroup],
                                    service_connect_configuration=ecs.ServiceConnectProps(
                                    namespace=default_cloud_map_namespace.namespace_name,
                                    services=[ecs.ServiceConnectService(
                                        port_mapping_name="data",  # Logical name for the service
                                        port=5001,  # Container port
                                    )]),
                                    service_name="backend-service")
        # Creating a public load balancer that will listen on port 80 and forward requests to the frontend ecs container,
        # healthchecks are established on port 5000
        public_lb_sg = ec2.SecurityGroup(self, "PublicLBSG", vpc=vpc, description="Public LB SG", allow_all_outbound=True)
        target_group = elbv2.ApplicationTargetGroup(
            self, "TargetGroup",
            target_group_name="ecs-target-group",
            vpc=vpc,
            port=80,
            targets=[frontend_service],
            target_type=elbv2.TargetType.IP,
            protocol=elbv2.ApplicationProtocol.HTTP,
            health_check=elbv2.HealthCheck(
                path="/",
                port="5000",
                interval=Duration.seconds(6),
                timeout=Duration.seconds(5),
                healthy_threshold_count=2,
                unhealthy_threshold_count=2,
            ),
        )
        target_group.set_attribute(key="deregistration_delay.timeout_seconds",
                value="120")
        public_lb_sg.add_ingress_rule(peer=ec2.Peer.any_ipv4(), connection=ec2.Port.tcp(80), description="Allow HTTP traffic")
        public_lb = elbv2.ApplicationLoadBalancer(self, "FrontendLB", vpc=vpc, internet_facing=True, security_group=public_lb_sg, vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PUBLIC))
        public_lb.set_attribute(key="idle_timeout.timeout_seconds", value="30")
        listener = public_lb.add_listener("Listener", port=80, default_action=elbv2.ListenerAction.forward(target_groups=[target_group]))
        lb_rule = elbv2.ApplicationListenerRule(
            self, "ListenerRule",
            listener=listener,
            priority=1,
            action=elbv2.ListenerAction.forward(target_groups=[target_group]),
            conditions=[elbv2.ListenerCondition.path_patterns(["*"])],
        )
        CfnOutput(self, "Load Balancer URL", value=f"http://{public_lb.load_balancer_dns_name}")
