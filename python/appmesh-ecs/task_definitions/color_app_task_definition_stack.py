# give me a boilerplate cdk class 
import aws_cdk as core
import aws_cdk.aws_ec2 as ec2
import aws_cdk.aws_ecs as ecs
import aws_cdk.aws_iam as iam
import aws_cdk.aws_ecr as ecr
import aws_cdk.aws_logs as logs
import aws_cdk.aws_appmesh as appmesh
import aws_cdk.aws_ssm as ssm
from aws_cdk.aws_ecs import BaseService
import aws_cdk.aws_elasticloadbalancingv2 as elbv2
from aws_cdk import Stack, Tags, App, Duration
from constructs import Construct

from aws_cdk import (
    aws_appmesh as appmesh,
    
)
import aws_cdk as core
import aws_cdk.aws_servicediscovery as servicediscovery
class ColorAppTaskDefinitionStack(Stack):
   
   # This function creates the task definitions for each color service
   def create_color_task_definition(self, color, environment_name):
        task_definition = ecs.FargateTaskDefinition(
            self, f"colorTellerTask-{color}",
            family=f"{environment_name}-ColorTeller-{color}",
            cpu=256,
            memory_limit_mib=512,
            task_role=iam.Role.from_role_arn(
                self, f"TaskDefinitionTaskRole-{color}",
                role_arn=core.Fn.import_value(f"{environment_name}:ECSTaskIamRole")
            ),
            execution_role=iam.Role.from_role_arn(
                self, f"ExecutionRole-{color}",
                role_arn=core.Fn.import_value(f"{environment_name}:TaskExecutionIamRole")
            )
        )
        proxy_config = ecs.AppMeshProxyConfiguration(
                container_name="envoy",
                properties=ecs.AppMeshProxyConfigurationProps(
                    ignored_uid=1337,
                    app_ports=[9080],
                    proxy_ingress_port=15000,
                    proxy_egress_port=15001,
                    egress_ignored_i_ps=["169.254.170.2,169.254.169.254"]
                )

            )
        envoy = task_definition.add_container(
                "envoy",
                image=ecs.ContainerImage.from_registry(f"840364872350.dkr.ecr.{core.Aws.REGION}.amazonaws.com/aws-appmesh-envoy:v1.29.6.1-prod"),
                user="1337",
                container_name="envoy",
                memory_reservation_mib=256,
                environment={
                    "APPMESH_RESOURCE_ARN": core.Fn.sub("mesh/${MeshName}/virtualNode/colorteller-${app_name}-vn", {"MeshName": core.Fn.import_value(f"{environment_name}:Mesh"), "app_name": color }),
                    "ENVOY_LOG_LEVEL": "DEBUG",
                    "ENABLE_ENVOY_XRAY_TRACING": "1",
                    "ENABLE_ENVOY_STATS_TAGS": "1"
                },
                health_check=ecs.HealthCheck(
                    command=["CMD-SHELL", "curl -s http://localhost:9901/server_info | grep state | grep -q LIVE"],
                    interval=Duration.seconds(5),
                    retries=3,
                    timeout=Duration.seconds(2)
                ),
                logging=ecs.LogDriver.aws_logs(
                    stream_prefix=f"colorteller-{color}-envoy",
                    log_group=logs.LogGroup.from_log_group_arn(
                        self, f"AppLogGroup-{color}-envoy",
                        log_group_arn=core.Fn.import_value(f"{environment_name}:ECSServicelogGroupARN")
                    )
                ),
                essential=True,
                port_mappings=[ecs.PortMapping(container_port=15000, host_port=15000, protocol=ecs.Protocol.TCP), ecs.PortMapping(container_port=15001, host_port=15001, protocol=ecs.Protocol.TCP), ecs.PortMapping(container_port=9901, host_port=9901, protocol=ecs.Protocol.TCP),],
                ulimits=[ecs.Ulimit(hard_limit=15000, name=ecs.UlimitName.NOFILE, soft_limit=15000)],
            )

            # Container Definitions
        repo = ecr.Repository.from_repository_name(self, f"AppECRRepo-{color}", repository_name="colorteller")
        app_container = task_definition.add_container(
                "app",
                image=ecs.ContainerImage.from_ecr_repository(repository=repo, tag='latest'),
                # ecr.Repository.from_repository_arn(
                #     self, "AppECRRepo",
                #     repository_arn=f"arn:aws:ecr:{core.Aws.REGION}:{core.Aws.ACCOUNT_ID}:repository/colorteller",
                    
                # ),
                logging=ecs.LogDriver.aws_logs(
                    stream_prefix=f"colorteller-{color}-app",
                    log_group=logs.LogGroup.from_log_group_arn(
                        self, f"AppLogGroup-{color}",
                        log_group_arn=core.Fn.import_value(f"{environment_name}:ECSServicelogGroupARN")
                    )
                ),
                environment={
                    "COLOR": color,
                    "SERVER_PORT": "9080"
                },
                port_mappings=[ecs.PortMapping(container_port=9080, host_port=9080, protocol=ecs.Protocol.TCP)],
                # container_depends_on=[
                #     ecs.ContainerDependency(
                            
                #             container=envoy,
                #             condition=ecs.ContainerDependencyCondition.HEALTHY
                        
                #     )
                # ]
            )
        app_container.add_container_dependencies(ecs.ContainerDependency(
                container=envoy,
                condition=ecs.ContainerDependencyCondition.HEALTHY
            ))

        xray_container = task_definition.add_container(
                "xrayContainer",
                image=ecs.ContainerImage.from_registry("amazon/aws-xray-daemon"),
                user="1337",
                logging=ecs.LogDriver.aws_logs(
                    stream_prefix=f"colorteller-{color}-xray",
                    log_group=logs.LogGroup.from_log_group_arn(
                        self, f"XrayLogGroup-{color}",
                        log_group_arn=core.Fn.import_value(f"{environment_name}:ECSServicelogGroupARN")
                    )
                ),
                memory_reservation_mib=256,
                port_mappings=[ecs.PortMapping(container_port=2000, host_port=2000, protocol=ecs.Protocol.TCP)],
                
            )
        return task_definition
   # This function creates the ECS service for each corresponding color
   def create_color_service(self, color, namespace, taskdef, imported_vpc ):
        environment_name ="appmesh-env"

        cluster = ecs.Cluster.from_cluster_attributes(self, f"Cluster-{color}",
                                               cluster_name=core.Fn.import_value(f"{environment_name}:ECSCluster"),
                                               vpc=imported_vpc,
                                               
                                               )
        security_group_id = ec2.SecurityGroup.from_security_group_id(
             self, f"SecurityGroup-{color}",
             security_group_id=core.Fn.import_value(f"{environment_name}:ECSServiceSecurityGroup")
        )
        namespace_name = f'colorteller-{color}'
        if color=='white':
             namespace_name = 'colorteller'
        
        
        return ecs.FargateService(
            self, f"ColorTeller{color}Service",
            cluster=cluster,
            service_name=f'colorteller-{color}-service',
            desired_count=1,
            max_healthy_percent=200,
            min_healthy_percent=100,
            task_definition=taskdef,
            vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS),
            assign_public_ip=False,
            security_groups=[security_group_id],
            cloud_map_options=ecs.CloudMapOptions(cloud_map_namespace=namespace, dns_record_type=servicediscovery.DnsRecordType.A, dns_ttl=core.Duration.seconds(300), failure_threshold=1, name=namespace_name)
        )
   # This function creates the load balancer infrastructure
   def create_load_balanced_service(self, vpc, color_gateway_service):
        PublicLoadBalancerSG = ec2.SecurityGroup(
            self, "PublicLoadBalancerSG",
                    vpc=vpc,
                    description="ECS Security Group",
                    
                    allow_all_outbound=True,
        )
        TargetGroup = elbv2.ApplicationTargetGroup(
            self, "WebTargetGroup",
            target_group_name="color-teller-target-group2",
            port=80,
            vpc=vpc,
            targets=[color_gateway_service],
            target_type=elbv2.TargetType.IP,
            protocol=elbv2.ApplicationProtocol.HTTP,
            health_check=elbv2.HealthCheck(
                path="/ping",
                port="9080",
                interval=Duration.seconds(6),
                timeout=Duration.seconds(5),
                healthy_threshold_count=2,
                unhealthy_threshold_count=2,
            ),
            

        )
        TargetGroup.set_attribute(key="deregistration_delay.timeout_seconds",
                value="120")
        PublicLoadBalancerSG.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(80), "Allow HTTP Ingress")
        lb = elbv2.ApplicationLoadBalancer(self, "PublicLoadBalancer",
            
             vpc=vpc,
             internet_facing=True,
             security_group=PublicLoadBalancerSG,
             vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PUBLIC),
        )
        lb.set_attribute(key="idle_timeout.timeout_seconds",
                value="30")
        listener = lb.add_listener("Public Listener",
                        port=80,
                        
                        default_action=elbv2.ListenerAction.forward(
                            target_groups=[TargetGroup]
                        ),
        )

        # listener.add_targets("ECS",
        #     port=80,
        #     targets=[BaseService.load_balancer_target(
        #         self,
        #         container_name="app",
        #         container_port=9080
        #     )],
            
        # )xw
        WebLoadBalancerRule = elbv2.ApplicationListenerRule(
             self, "WebLoadBalancerRule",
            listener=listener,
            priority=1,
            action=elbv2.ListenerAction.forward(target_groups=[TargetGroup]),
            conditions=[elbv2.ListenerCondition.path_patterns(["*"])],
        )
        return lb.load_balancer_dns_name, TargetGroup

        
   def __init__(self, scope: Construct, id: str, **kwargs, ) -> None:
        super().__init__(scope, id, **kwargs )
        environment_name ="appmesh-env"
        mesh_name = core.Fn.import_value(f"{environment_name}:Mesh")
        vpc_id = core.Fn.import_value(f"{environment_name}:VPCID")
        vpc_id = ssm.StringParameter.value_from_lookup(self, "vpc_id")
        imported_vpc = ec2.Vpc.from_lookup(self, "ImportedVPC", vpc_id=vpc_id)
        imported_cluster = ecs.Cluster.from_cluster_attributes(self, f"ColorGatewayCluster", cluster_name=core.Fn.import_value(f"{environment_name}:ECSCluster"),vpc=imported_vpc)
        color_teller_colors = ["red", "black", "blue", "white"]

        namespace = servicediscovery.PrivateDnsNamespace.from_private_dns_namespace_attributes(self, "Namespace",
            namespace_arn=core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespaceARN"), 
            namespace_id=core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespaceID"),
            namespace_name=core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespaceName"))   

        # Loop through all the colors to create their task definitions and ECS services
        for color in color_teller_colors:
            task_definition = self.create_color_task_definition(color, environment_name)
            service = self.create_color_service(color, namespace, taskdef=task_definition, imported_vpc=imported_vpc)

            core.CfnOutput(
            self, f"ColorTellerTaskDefinitionArn-{color}",
            value=task_definition.task_definition_arn,
            export_name=f"{environment_name}:ColorTellerTaskDefinitionArn-{color}"
            )
            
        colorGatewayProxyConfiguration = ecs.AppMeshProxyConfiguration(
            container_name="envoy",
            properties=ecs.AppMeshProxyConfigurationProps(
            proxy_ingress_port=15000,
            proxy_egress_port=15001,
            app_ports=[9080],
            ignored_uid=1337,
            egress_ignored_i_ps=["169.254.170.2,169.254.169.254"]
            )
            
        )
        colorGatewayTaskDefinition = ecs.FargateTaskDefinition(self,
            "colorGatewayTaskDefinition",
            cpu=256,
            memory_limit_mib=512,
            proxy_configuration=colorGatewayProxyConfiguration,
            task_role=iam.Role.from_role_arn(
                self, f"TaskDefinitionTaskRoleGateway",
                role_arn=core.Fn.import_value(f"{environment_name}:ECSTaskIamRole")
            ),
            execution_role=iam.Role.from_role_arn(
                self, f"ExecutionRoleGateway",
                role_arn=core.Fn.import_value(f"{environment_name}:TaskExecutionIamRole")
            )
            )
        
        color_gateway_repo = ecr.Repository.from_repository_name(self, f"AppECRRepoGateway", repository_name="gateway")
        
        # The following creates the containers for the gateway ECS service
        # don't change the order of containers, the LB will use the app one by default since it is the first essential container
        gateway_app_td = colorGatewayTaskDefinition.add_container(
            "app",
            image=ecs.ContainerImage.from_ecr_repository(repository=color_gateway_repo, tag='latest'),
            port_mappings=[ecs.PortMapping(container_port=9080, host_port=9080, protocol=ecs.Protocol.TCP)],
            environment=
                 {"SERVER_PORT": "9080",
                 "COLOR_TELLER_ENDPOINT": core.Fn.sub("colorteller.${SERVICES_DOMAIN}:9080", {"SERVICES_DOMAIN": core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespace")}) ,
                 "TCP_ECHO_ENDPOINT": core.Fn.sub("tcpecho.${SERVICES_DOMAIN}:2701", {"SERVICES_DOMAIN": core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespace")})}

                          ,
            logging=ecs.LogDriver.aws_logs(
                    stream_prefix=f"colorteller-gateway-app",
                    log_group=logs.LogGroup.from_log_group_arn(
                        self, f"AppLogGroupGateway-app",
                        log_group_arn=core.Fn.import_value(f"{environment_name}:ECSServicelogGroupARN")
                    )
                ),
            essential=True,
        )
        gateway_envoy_td = colorGatewayTaskDefinition.add_container(
            "envoy",
            user="1337",
            memory_reservation_mib=256,
            image=ecs.ContainerImage.from_registry(f"840364872350.dkr.ecr.{core.Aws.REGION}.amazonaws.com/aws-appmesh-envoy:v1.29.6.1-prod"),
            port_mappings=[ecs.PortMapping(container_port=15000, host_port=15000, protocol=ecs.Protocol.TCP), ecs.PortMapping(container_port=15001, host_port=15001, protocol=ecs.Protocol.TCP), ecs.PortMapping(container_port=9901, host_port=9901, protocol=ecs.Protocol.TCP),],
            ulimits=[ecs.Ulimit(name=ecs.UlimitName.NOFILE, soft_limit=15000, hard_limit=15000)],

            environment={
                          "APPMESH_RESOURCE_ARN": f"mesh/{mesh_name}/virtualNode/colorgateway-vn",
                          "ENVOY_LOG_LEVEL": "DEBUG", 
                          "ENABLE_ENVOY_XRAY_TRACING": "1",
                          "ENABLE_ENVOY_STATS_TAGS": "1"},

            logging=ecs.LogDriver.aws_logs(
                    stream_prefix=f"colorteller-gateway-envoy",
                    log_group=logs.LogGroup.from_log_group_arn(
                        self, f"AppLogGroupGateway-envoy",
                        log_group_arn=core.Fn.import_value(f"{environment_name}:ECSServicelogGroupARN")
                    )
                ),
            health_check=ecs.HealthCheck(
                command=["CMD-SHELL", "curl -s http://localhost:9901/server_info | grep state | grep -q LIVE"],
                interval=Duration.seconds(5),
                retries=3,
                timeout=Duration.seconds(2),
            ),
            essential=True,
        )
        gateway_xray_td = colorGatewayTaskDefinition.add_container(
            "xray",
            image=ecs.ContainerImage.from_registry("amazon/aws-xray-daemon"),
            user="1337",
            port_mappings=[ecs.PortMapping(container_port=2000, host_port=2000, protocol=ecs.Protocol.TCP)],
            memory_reservation_mib=256,
            # logging=ecs.LogDrivers.aws_logs(
            #     stream_prefix="colorteller-gateway-",
            #     log_group=core.Fn.import_value(f"{environment_name}:ECSServicelogGroupARN"),

            # ),
            logging=ecs.LogDriver.aws_logs(
                    stream_prefix=f"colorteller-gateway-xray",
                    log_group=logs.LogGroup.from_log_group_arn(
                        self, f"AppLogGroupGateway-xray",
                        log_group_arn=core.Fn.import_value(f"{environment_name}:ECSServicelogGroupARN")
                    )
                ),
            essential=True,
        )

        gateway_app_td.add_container_dependencies(ecs.ContainerDependency(
                container=gateway_envoy_td,
                condition=ecs.ContainerDependencyCondition.HEALTHY
            ))

        TcpEchoTaskDefinition = ecs.FargateTaskDefinition(
            self, f"TesterTaskDefinition",
            family="tester",
            cpu=256,
            memory_limit_mib=512,
            task_role=iam.Role.from_role_arn(
                self, "TcpEchoTaskDefinition",
                role_arn=core.Fn.import_value(f"{environment_name}:ECSTaskIamRole")
            ),
            execution_role=iam.Role.from_role_arn(
                self, f"ExecutionRoleTCP",
                role_arn=core.Fn.import_value(f"{environment_name}:TaskExecutionIamRole")
            )
        
                                                         
                                                         
            )
        TcpEchoTaskDefinition.add_container(
            "app",
            image=ecs.ContainerImage.from_registry("cjimti/go-echo"),
            port_mappings=[ecs.PortMapping(container_port=2701, host_port=2701, protocol=ecs.Protocol.TCP)],
            logging=ecs.LogDriver.aws_logs(
                    stream_prefix=f"tcp-echo",
                    log_group=logs.LogGroup.from_log_group_arn(
                        self, "tcpecho-app",
                        log_group_arn=core.Fn.import_value(f"{environment_name}:ECSServicelogGroupARN")
                    )
                ),
            environment={"NODE_NAME": core.Fn.sub(
                            "mesh/${AppMeshMeshName}/virtualNode/tcpecho-vn",
                            {"AppMeshMeshName": f"{environment_name}:Mesh"}
                        )},
            essential=True,
        )
        security_group_id = ec2.SecurityGroup.from_security_group_id(
             self, f"SecurityGroupTcp",
             security_group_id=core.Fn.import_value(f"{environment_name}:ECSServiceSecurityGroup")
        )
        colorGatewayService = ecs.FargateService(
            self, "ColorGatewayECSService",
            cluster=imported_cluster,
            service_name=f'colorgateway-service',
            desired_count=1,
            max_healthy_percent=200,
            min_healthy_percent=100,
            task_definition=colorGatewayTaskDefinition,
            vpc_subnets=ec2.SubnetSelection(one_per_az=True, subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS),
            security_groups=[security_group_id],
            cloud_map_options=ecs.CloudMapOptions(cloud_map_namespace=namespace, name='colorgateway',dns_ttl=core.Duration.seconds(300), dns_record_type=servicediscovery.DnsRecordType.A, failure_threshold=1)
        )
        TcpEchoService = ecs.FargateService(self, f"TcpEchoService",
                                            cluster=imported_cluster,
                                            task_definition=TcpEchoTaskDefinition,
                                            service_name=f"tcpecho", 
                                            max_healthy_percent=200,
                                            min_healthy_percent=100,
                                            desired_count=1,
                                            security_groups=[security_group_id],
                                            vpc_subnets=ec2.SubnetSelection(one_per_az=True, subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS),
                                            cloud_map_options=ecs.CloudMapOptions(cloud_map_namespace=namespace,dns_record_type=servicediscovery.DnsRecordType.A,
            dns_ttl=core.Duration.seconds(300), failure_threshold=1, name="tcpecho"))
        lb, tg = self.create_load_balanced_service(imported_vpc, color_gateway_service=colorGatewayService)
        core.CfnOutput(
            self, "ColorAppEndpoint",
            description="Public endpoint for Color App Service",
            value=core.Fn.join("", ["http://", lb]),
            export_name="ColorAppEndpoint"
        )
        core.CfnOutput(
            self, "ColorGatewayTaskDefinitionArn",
            value=colorGatewayTaskDefinition.task_definition_arn,
            export_name=f"{environment_name}:ColorGatewayTaskDefinitionArn"
        )
        
       
    