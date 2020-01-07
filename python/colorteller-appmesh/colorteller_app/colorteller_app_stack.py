from aws_cdk import core, aws_ec2, aws_ecs, aws_iam, aws_ecr, aws_logs, aws_elasticloadbalancingv2, aws_servicediscovery
import os


class ColorTellerAppStack(core.Stack):

    def __init__(self, scope, id, vpc, **kwarg) -> None:
        super().__init__(scope, id, **kwarg)

        # cluster creation
        cluster = aws_ecs.Cluster(
            self, 'fargate-service-autoscaling',
            vpc=vpc
        )

        # service discovery creation
        sd_namespace = cluster.add_default_cloud_map_namespace(
            name="svc.test.local", vpc=vpc)
        aws_servicediscovery.Service(
            self, "svc.test.local", namespace=sd_namespace, load_balancer=True)

        # ECS role creation
        ecs_principle = aws_iam.ServicePrincipal('ecs-tasks.amazonaws.com')
        execution_role = aws_iam.Role(
            self, 'execution-role', assumed_by=ecs_principle)
        execution_role.add_managed_policy(policy=aws_iam.ManagedPolicy.from_aws_managed_policy_name(
            managed_policy_name="AWSCodeDeployRoleForECS"))
        execution_role.add_managed_policy(policy=aws_iam.ManagedPolicy.from_aws_managed_policy_name(
            managed_policy_name="AmazonEC2ContainerRegistryReadOnly"))
        task_role = aws_iam.Role(
            self, 'task-role', assumed_by=ecs_principle)
        task_role.add_managed_policy(aws_iam.ManagedPolicy.from_aws_managed_policy_name(
            managed_policy_name="AWSAppMeshEnvoyAccess"))
        task_role.add_managed_policy(aws_iam.ManagedPolicy.from_aws_managed_policy_name(
            managed_policy_name="CloudWatchFullAccess"))
        task_role.add_managed_policy(aws_iam.ManagedPolicy.from_aws_managed_policy_name(
            managed_policy_name="AWSXRayDaemonWriteAccess"))

        # envoy ecr object
        envoy_ecr = aws_ecr.Repository.from_repository_attributes(
            self, 'aws-envoy', repository_arn=core.Stack.of(self).format_arn(
                service="ecr",
                resource="aws-appmesh-envoy",
                account="840364872350"
            ),
            repository_name="aws-appmesh-envoy")

        # colorteller image builds
        gateway_image = aws_ecs.ContainerImage.from_asset(
            "./src/gateway")
        colorteller_image = aws_ecs.ContainerImage.from_asset(
            "./src/colorteller")

        # logging setup
        log_group = aws_logs.LogGroup(
            self, "/ecs/colorteller", retention=aws_logs.RetentionDays.ONE_DAY)
        gateway_ecs_logs = aws_ecs.LogDriver.aws_logs(
            log_group=log_group, stream_prefix="gateway")
        black_ecs_logs = aws_ecs.LogDriver.aws_logs(
            log_group=log_group, stream_prefix="black")
        blue_ecs_logs = aws_ecs.LogDriver.aws_logs(
            log_group=log_group, stream_prefix="blue")
        red_ecs_logs = aws_ecs.LogDriver.aws_logs(
            log_group=log_group, stream_prefix="red")
        white_ecs_logs = aws_ecs.LogDriver.aws_logs(
            log_group=log_group, stream_prefix="white")
        tcpecho_ecs_logs = aws_ecs.LogDriver.aws_logs(
            log_group=log_group, stream_prefix="tcpecho")

        # Mesh properties setup
        mesh_properties = aws_ecs.AppMeshProxyConfigurationProps(
            app_ports=[9080],
            proxy_egress_port=15001,
            proxy_ingress_port=15000,
            egress_ignored_i_ps=["169.254.170.2", "169.254.169.254"],
            ignored_uid=1337)

        # envoy ulimit defaults
        envoy_ulimit = aws_ecs.Ulimit(
            hard_limit=15000, name=aws_ecs.UlimitName.NOFILE, soft_limit=15000)

        # fargate task def - requires envoy proxy container, gateway app and x-ray
        gateway_task_def = aws_ecs.FargateTaskDefinition(
            self,
            "gateway_task",
            cpu=256,
            memory_limit_mib=512,
            execution_role=execution_role,
            task_role=task_role,
            proxy_configuration=aws_ecs.AppMeshProxyConfiguration(
                container_name="envoy", properties=mesh_properties)
        )
        gateway_task_def.add_container(
            "gateway",
            logging=gateway_ecs_logs,
            environment={
                "SERVER_PORT": "9080",
                "STAGE": "v1.1",
                "COLOR_TELLER_ENDPOINT": "colorteller.svc.test.local:9080",
                "TCP_ECHO_ENDPOINT": "tcpecho.svc.test.local:2701"
            },
            image=gateway_image).add_port_mappings(
            aws_ecs.PortMapping(
                container_port=9080,
                protocol=aws_ecs.Protocol.TCP)
        )
        gateway_task_def.add_container(
            "xray",
            logging=gateway_ecs_logs,
            image=aws_ecs.ContainerImage.from_registry(
                "amazon/aws-xray-daemon")
        ).add_port_mappings(aws_ecs.PortMapping(
            container_port=2000,
            protocol=aws_ecs.Protocol.UDP
        ))
        gateway_envoy_container = gateway_task_def.add_container(
            "envoy",
            logging=gateway_ecs_logs,
            environment={
                "ENVOY_LOG_LEVEL": "debug",
                "ENABLE_ENVOY_XRAY_TRACING": "1",
                "ENABLE_ENVOY_STATS_TAGS": "1",
                "APPMESH_VIRTUAL_NODE_NAME": "mesh/ColorTellerAppMesh/virtualNode/gateway",
                "APPMESH_XDS_ENDPOINT": ""
            },
            image=aws_ecs.ContainerImage.from_ecr_repository(
                repository=envoy_ecr, tag="v1.12.1.1-prod"),
            essential=True,
            user="1337",
            health_check=aws_ecs.HealthCheck(command=[
                "CMD-SHELL", "curl -s http://localhost:9901/ready |grep -q LIVE"])
        )
        gateway_envoy_container.add_port_mappings(aws_ecs.PortMapping(
            container_port=9901,
            protocol=aws_ecs.Protocol.TCP),
            aws_ecs.PortMapping(
                container_port=15000,
                protocol=aws_ecs.Protocol.TCP),
            aws_ecs.PortMapping(
                container_port=15001,
                protocol=aws_ecs.Protocol.TCP),
        )
        gateway_envoy_container.add_ulimits(envoy_ulimit)

        # black task def - requires color app, envoy and x-ray containers
        black_task_def = aws_ecs.FargateTaskDefinition(
            self,
            "black-task",
            cpu=256,
            family="black",
            memory_limit_mib=512,
            execution_role=execution_role,
            task_role=task_role,
            proxy_configuration=aws_ecs.AppMeshProxyConfiguration(
                container_name="envoy", properties=mesh_properties))
        black_envoy_container = black_task_def.add_container(
            "envoy",
            logging=black_ecs_logs,
            environment={
                "ENVOY_LOG_LEVEL": "info",
                "ENABLE_ENVOY_XRAY_TRACING": "1",
                "ENABLE_ENVOY_STATS_TAGS": "1",
                "APPMESH_VIRTUAL_NODE_NAME": "mesh/ColorTellerAppMesh/virtualNode/black",
                "APPMESH_XDS_ENDPOINT": ""
            },
            image=aws_ecs.ContainerImage.from_ecr_repository(
                repository=envoy_ecr, tag="v1.12.1.1-prod"),
            essential=True,
            user="1337",
            health_check=aws_ecs.HealthCheck(
                command=["CMD-SHELL",
                         "curl -s http://localhost:9901/ready |grep -q LIVE"]
            )
        )
        black_envoy_container.add_port_mappings(
            aws_ecs.PortMapping(
                container_port=9901,
                protocol=aws_ecs.Protocol.TCP),
            aws_ecs.PortMapping(
                container_port=15000,
                protocol=aws_ecs.Protocol.TCP),
            aws_ecs.PortMapping(
                container_port=15001,
                protocol=aws_ecs.Protocol.TCP),
        )
        black_envoy_container.add_ulimits(envoy_ulimit)
        black_app_container = black_task_def.add_container(
            "black",
            logging=black_ecs_logs,
            environment={
                "COLOR": "black",
                "SERVER_PORT": "9080",
                "STAGE": "v1.1"
            },
            image=colorteller_image)
        black_app_container.add_port_mappings(
            aws_ecs.PortMapping(
                container_port=9080,
                protocol=aws_ecs.Protocol.TCP)
        )
        black_app_container.add_container_dependencies(
            aws_ecs.ContainerDependency(
                container=black_envoy_container,
                condition=aws_ecs.ContainerDependencyCondition.HEALTHY
            )
        )
        black_task_def.add_container(
            "xray",
            logging=black_ecs_logs,
            image=aws_ecs.ContainerImage.from_registry(
                "amazon/aws-xray-daemon")
        ).add_port_mappings(aws_ecs.PortMapping(
            container_port=2000,
            protocol=aws_ecs.Protocol.UDP
        ))

        # blue task def (same as black)
        blue_task_def = aws_ecs.FargateTaskDefinition(
            self,
            "blue-task",
            cpu=256,
            family="blue",
            memory_limit_mib=512,
            execution_role=execution_role,
            task_role=task_role,
            proxy_configuration=aws_ecs.AppMeshProxyConfiguration(
                container_name="envoy", properties=mesh_properties))
        blue_envoy_container = blue_task_def.add_container(
            "envoy",
            logging=blue_ecs_logs,
            environment={
                "ENVOY_LOG_LEVEL": "info",
                "ENABLE_ENVOY_XRAY_TRACING": "1",
                "ENABLE_ENVOY_STATS_TAGS": "1",
                "APPMESH_VIRTUAL_NODE_NAME": "mesh/ColorTellerAppMesh/virtualNode/blue",
                "APPMESH_XDS_ENDPOINT": ""
            },
            image=aws_ecs.ContainerImage.from_ecr_repository(
                repository=envoy_ecr, tag="v1.12.1.1-prod"),
            essential=True,
            user="1337",
            health_check=aws_ecs.HealthCheck(
                command=["CMD-SHELL",
                         "curl -s http://localhost:9901/ready |grep -q LIVE"]
            )
        )
        blue_envoy_container.add_port_mappings(
            aws_ecs.PortMapping(
                container_port=9901,
                protocol=aws_ecs.Protocol.TCP),
            aws_ecs.PortMapping(
                container_port=15000,
                protocol=aws_ecs.Protocol.TCP),
            aws_ecs.PortMapping(
                container_port=15001,
                protocol=aws_ecs.Protocol.TCP),
        )
        blue_envoy_container.add_ulimits(envoy_ulimit)
        blue_app_container = blue_task_def.add_container(
            "blue",
            logging=blue_ecs_logs,
            environment={
                "COLOR": "black",
                "SERVER_PORT": "9080",
                "STAGE": "v1.1"
            },
            image=colorteller_image)
        blue_app_container.add_port_mappings(
            aws_ecs.PortMapping(
                container_port=9080,
                protocol=aws_ecs.Protocol.TCP)
        )
        blue_app_container.add_container_dependencies(
            aws_ecs.ContainerDependency(
                container=blue_envoy_container,
                condition=aws_ecs.ContainerDependencyCondition.HEALTHY
            )
        )
        blue_task_def.add_container(
            "xray",
            logging=blue_ecs_logs,
            image=aws_ecs.ContainerImage.from_registry(
                "amazon/aws-xray-daemon")
        ).add_port_mappings(aws_ecs.PortMapping(
            container_port=2000,
            protocol=aws_ecs.Protocol.UDP
        ))

        # red task def (same as black)
        red_task_def = aws_ecs.FargateTaskDefinition(
            self,
            "red-task",
            cpu=256,
            family="red-task",
            memory_limit_mib=512,
            execution_role=execution_role,
            task_role=task_role,
            proxy_configuration=aws_ecs.AppMeshProxyConfiguration(
                container_name="envoy", properties=mesh_properties))
        red_envoy_container = red_task_def.add_container(
            "envoy",
            logging=red_ecs_logs,
            environment={
                "ENVOY_LOG_LEVEL": "info",
                "ENABLE_ENVOY_XRAY_TRACING": "1",
                "ENABLE_ENVOY_STATS_TAGS": "1",
                "APPMESH_VIRTUAL_NODE_NAME": "mesh/ColorTellerAppMesh/virtualNode/red",
                "APPMESH_XDS_ENDPOINT": ""
            },
            image=aws_ecs.ContainerImage.from_ecr_repository(
                repository=envoy_ecr, tag="v1.12.1.1-prod"),
            essential=True,
            user="1337",
            health_check=aws_ecs.HealthCheck(
                command=["CMD-SHELL",
                         "curl -s http://localhost:9901/ready |grep -q LIVE"]
            )
        )
        red_envoy_container.add_port_mappings(aws_ecs.PortMapping(
            container_port=9901,
            protocol=aws_ecs.Protocol.TCP),
            aws_ecs.PortMapping(
                container_port=15000,
                protocol=aws_ecs.Protocol.TCP),
            aws_ecs.PortMapping(
                container_port=15001,
                protocol=aws_ecs.Protocol.TCP),
        )
        red_envoy_container.add_ulimits(envoy_ulimit)
        red_app_container = red_task_def.add_container("red", logging=red_ecs_logs, environment={
            "COLOR": "red",
            "SERVER_PORT": "9080",
            "STAGE": "v1.2"
        }, image=colorteller_image)
        red_app_container.add_port_mappings(aws_ecs.PortMapping(
            container_port=9080,
            protocol=aws_ecs.Protocol.TCP
        ))
        red_app_container.add_container_dependencies(
            aws_ecs.ContainerDependency(
                container=red_envoy_container,
                condition=aws_ecs.ContainerDependencyCondition.HEALTHY
            )
        )
        red_task_def.add_container(
            "xray",
            logging=red_ecs_logs,
            image=aws_ecs.ContainerImage.from_registry(
                "amazon/aws-xray-daemon")
        ).add_port_mappings(aws_ecs.PortMapping(
            container_port=2000,
            protocol=aws_ecs.Protocol.UDP
        ))

        # white task def (same as black) - colorteller.svc.test.local points to this service (because containers need something to resolve to or they fail)
        white_task_def = aws_ecs.FargateTaskDefinition(
            self,
            "white-task",
            cpu=256,
            family="white",
            memory_limit_mib=512,
            execution_role=execution_role,
            task_role=task_role,
            proxy_configuration=aws_ecs.AppMeshProxyConfiguration(
                container_name="envoy", properties=mesh_properties))
        white_envoy_container = white_task_def.add_container(
            "envoy",
            logging=white_ecs_logs,
            environment={
                "ENVOY_LOG_LEVEL": "info",
                "ENABLE_ENVOY_XRAY_TRACING": "1",
                "ENABLE_ENVOY_STATS_TAGS": "1",
                "APPMESH_VIRTUAL_NODE_NAME": "mesh/ColorTellerAppMesh/virtualNode/white",
                "APPMESH_XDS_ENDPOINT": ""
            },
            image=aws_ecs.ContainerImage.from_ecr_repository(
                repository=envoy_ecr, tag="v1.12.1.1-prod"),
            essential=True,
            user="1337",
            health_check=aws_ecs.HealthCheck(
                command=["CMD-SHELL",
                         "curl -s http://localhost:9901/ready |grep -q LIVE"]
            )
        )
        white_envoy_container.add_port_mappings(
            aws_ecs.PortMapping(
                container_port=9901,
                protocol=aws_ecs.Protocol.TCP),
            aws_ecs.PortMapping(
                container_port=15000,
                protocol=aws_ecs.Protocol.TCP),
            aws_ecs.PortMapping(
                container_port=15001,
                protocol=aws_ecs.Protocol.TCP),
        )
        white_envoy_container.add_ulimits(envoy_ulimit)
        white_app_container = white_task_def.add_container(
            "white",
            logging=white_ecs_logs,
            environment={
                "COLOR": "white",
                "SERVER_PORT": "9080",
                "STAGE": "v1.1"
            },
            image=colorteller_image)
        white_app_container.add_port_mappings(
            aws_ecs.PortMapping(
                container_port=9080,
                protocol=aws_ecs.Protocol.TCP
            )
        )
        white_app_container.add_container_dependencies(
            aws_ecs.ContainerDependency(
                container=white_envoy_container,
                condition=aws_ecs.ContainerDependencyCondition.HEALTHY)
        )
        white_task_def.add_container(
            "xray",
            logging=white_ecs_logs,
            image=aws_ecs.ContainerImage.from_registry(
                "amazon/aws-xray-daemon")
        ).add_port_mappings(
            aws_ecs.PortMapping(
                container_port=2000,
                protocol=aws_ecs.Protocol.UDP)
        )

        # tcpecho service (external docker image)
        tcpecho_task_def = aws_ecs.FargateTaskDefinition(
            self,
            'tcpecho-tasks',
            cpu=256,
            family="tcpecho",
            memory_limit_mib=512,
            execution_role=execution_role,
            task_role=task_role)
        tcpecho_task_def.add_container(
            "tcpecho",
            logging=tcpecho_ecs_logs,
            environment={
                "TCP_PORT": "2701",
                "NODE_NAME": "mesh/ColorTellerAppMesh/virtualNode/echo"
            },
            image=aws_ecs.ContainerImage.from_registry(
                "cjimti/go-echo"
            ),
            essential=True,
        ).add_port_mappings(
            aws_ecs.PortMapping(
                container_port=2701,
                protocol=aws_ecs.Protocol.TCP)
        )

        # adds task defs to fargate services - adds security group access to local vpc cidr block
        # all the services are treated the same way
        gateway_fargate_service = aws_ecs.FargateService(
            self,
            "gateway",
            cluster=cluster,
            task_definition=gateway_task_def,
            desired_count=2,
            cloud_map_options=aws_ecs.CloudMapOptions(
                cloud_map_namespace=sd_namespace,
                name="gateway")
        )
        gateway_fargate_service.connections.security_groups[0].add_ingress_rule(
            peer=aws_ec2.Peer.ipv4(vpc.vpc_cidr_block),
            connection=aws_ec2.Port.tcp(9080),
            description="Allow http inbound from VPC"
        )
        black_colorteller_fargate_service = aws_ecs.FargateService(
            self,
            "black",
            cluster=cluster,
            task_definition=black_task_def,
            desired_count=2, cloud_map_options=aws_ecs.CloudMapOptions(
                cloud_map_namespace=sd_namespace,
                name="black")
        )
        black_colorteller_fargate_service.connections.security_groups[0].add_ingress_rule(
            peer=aws_ec2.Peer.ipv4(vpc.vpc_cidr_block),
            connection=aws_ec2.Port.tcp(9080),
            description="Allow http inbound from VPC"
        )
        blue_colorteller_fargate_service = aws_ecs.FargateService(
            self, "blue",
            cluster=cluster,
            task_definition=blue_task_def,
            desired_count=2,
            cloud_map_options=aws_ecs.CloudMapOptions(
                cloud_map_namespace=sd_namespace,
                name="blue")
        )
        blue_colorteller_fargate_service.connections.security_groups[0].add_ingress_rule(
            peer=aws_ec2.Peer.ipv4(vpc.vpc_cidr_block),
            connection=aws_ec2.Port.tcp(9080),
            description="Allow http inbound from VPC"
        )
        red_colorteller_fargate_service = aws_ecs.FargateService(
            self,
            "red",
            cluster=cluster,
            task_definition=red_task_def,
            desired_count=2,
            cloud_map_options=aws_ecs.CloudMapOptions(
                cloud_map_namespace=sd_namespace,
                name="red")
        )
        red_colorteller_fargate_service.connections.security_groups[0].add_ingress_rule(
            peer=aws_ec2.Peer.ipv4(vpc.vpc_cidr_block),
            connection=aws_ec2.Port.tcp(9080),
            description="Allow http inbound from VPC"
        )
        white_colorteller_fargate_service = aws_ecs.FargateService(
            self,
            "white",
            cluster=cluster,
            task_definition=white_task_def,
            desired_count=2,
            cloud_map_options=aws_ecs.CloudMapOptions(
                cloud_map_namespace=sd_namespace,
                name="colorteller")
        )
        white_colorteller_fargate_service.connections.security_groups[0].add_ingress_rule(
            peer=aws_ec2.Peer.ipv4(vpc.vpc_cidr_block),
            connection=aws_ec2.Port.tcp(9080),
            description="Allow http inbound from VPC"
        )
        echo_fargate_service = aws_ecs.FargateService(
            self,
            "tcpecho",
            cluster=cluster,
            task_definition=tcpecho_task_def,
            desired_count=2,
            cloud_map_options=aws_ecs.CloudMapOptions(
                cloud_map_namespace=sd_namespace,
                name="tcpecho")
        )
        echo_fargate_service.connections.security_groups[0].add_ingress_rule(
            peer=aws_ec2.Peer.ipv4(vpc.vpc_cidr_block),
            connection=aws_ec2.Port.tcp(2701),
            description="Allow http inbound from VPC"
        )

        # adds autoscaling policies to all services
        for service in [black_colorteller_fargate_service, blue_colorteller_fargate_service, red_colorteller_fargate_service, white_colorteller_fargate_service, gateway_fargate_service, echo_fargate_service]:
            try:
                scaling = service.service.auto_scale_task_count(
                    max_capacity=2
                )
            except AttributeError:
                scaling = service.auto_scale_task_count(
                    max_capacity=2
                )
            scaling.scale_on_cpu_utilization(
                "CpuScaling",
                target_utilization_percent=50,
                scale_in_cooldown=core.Duration.seconds(60),
                scale_out_cooldown=core.Duration.seconds(60),
            )

        # configure loadbalancer to listen on port 80 and add targets to gateway and echo apps
        load_balancer = aws_elasticloadbalancingv2.ApplicationLoadBalancer(
            self, "lb",
            vpc=vpc,
            internet_facing=True
        )
        listener = load_balancer.add_listener(
            "PublicListener",
            port=80,
            open=True
        )

        health_check = aws_elasticloadbalancingv2.HealthCheck(
            interval=core.Duration.seconds(60),
            path="/ping",
            port="9080",
            timeout=core.Duration.seconds(5)
        )

        # attach ALB to ECS service
        listener.add_targets(
            "gateway",
            port=80,
            targets=[gateway_fargate_service, echo_fargate_service],
            health_check=health_check,
        )

        # outputs of ALB and cluster
        core.CfnOutput(
            self, "LoadBalancerDNS",
            value=load_balancer.load_balancer_dns_name
        )
        core.CfnOutput(
            self, "ClusterName",
            value=cluster.cluster_name
        )
