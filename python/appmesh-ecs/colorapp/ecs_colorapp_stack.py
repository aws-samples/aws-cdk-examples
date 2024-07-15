from aws_cdk import (
    aws_appmesh as appmesh,
    
)
import aws_cdk as core
from aws_cdk import Stack, Tags, App
from constructs import Construct
import aws_cdk.aws_ecs as ecs
import aws_cdk.aws_servicediscovery as servicediscovery
import aws_cdk.aws_elasticloadbalancingv2 as elbv2
import aws_cdk.aws_ec2 as ec2
class ColorAppStack(Stack):

    def __init__(self, scope: Construct, id: str, **kwargs, ) -> None:
        super().__init__(scope, id,  **kwargs )
        environment_name ="appmesh-env"
        ColorTellerWhiteServiceDiscoveryRecord = servicediscovery.CfnService(
            self, "ColorTellerWhiteServiceDiscovery",
            description="Service discovery for the white colorteller",
            tags=[{"key": "Name", "value": "ColorTellerWhite"}],
            name="colorteller",
            health_check_custom_config=
            servicediscovery.CfnService.HealthCheckCustomConfigProperty(
                failure_threshold=1
            ),
            dns_config=servicediscovery.CfnService.DnsConfigProperty(
                namespace_id=core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespaceID"),
                # routing_policy="MULTIVALUE",
                
                dns_records=[
                    servicediscovery.CfnService.DnsRecordProperty(
                        type="A",
                        ttl=300
                    )
                ],
                
            )
        )
        # Create a service for Color teller white in ECS
        ColorTellerWhiteService = ecs.CfnService(
            self, "ColorTellerWhiteService",
            cluster=core.Fn.import_value(f"{environment_name}:ECSCluster"),
            service_name="colorteller-white-service",
            service_registries=[
                ecs.CfnService.ServiceRegistryProperty(
                    registry_arn=ColorTellerWhiteServiceDiscoveryRecord.attr_arn
                )
            ],
            desired_count=1,
            launch_type="FARGATE",
            deployment_configuration=ecs.CfnService.DeploymentConfigurationProperty(
                maximum_percent=200,
                minimum_healthy_percent=100
            ),
            task_definition=core.Fn.import_value(f"{environment_name}:ColorTellerTaskDefinitionArn-white"),
            tags=[{"key": "Name", "value": "ColorTellerWhite"}],
            network_configuration=ecs.CfnService.NetworkConfigurationProperty(
                awsvpc_configuration=ecs.CfnService.AwsVpcConfigurationProperty(
                    subnets=[core.Fn.import_value(f"{environment_name}:PrivateSubnet1"), core.Fn.import_value(f"{environment_name}:PrivateSubnet2")],
                    assign_public_ip="DISABLED",
                    security_groups=[core.Fn.import_value(f"{environment_name}:ECSServiceSecurityGroup")]
                )
            )
        )
        # Create a service discovery record for the color teller blue service
        ColorTellerBlueServiceDiscoveryRecord = servicediscovery.CfnService(
            self, "ColorTellerBlueServiceDiscovery",
            description="Service discovery for the blue colorteller",
            tags=[{"key": "Name", "value": "ColorTellerBlue"}],
            name="colorteller-blue",
            dns_config=servicediscovery.CfnService.DnsConfigProperty(
                namespace_id=core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespaceID"),
                # routing_policy="MULTIVALUE",

                dns_records=[
                    servicediscovery.CfnService.DnsRecordProperty(
                        type="A",
                        ttl=300
                    )
                ],

            ),
            health_check_custom_config=servicediscovery.CfnService.HealthCheckCustomConfigProperty(
                failure_threshold=1
            )
        )
        # Create a service for the color teller blue service 
        ColorTellerBlueService = ecs.CfnService(
            self, "ColorTellerBlueService",
            cluster=core.Fn.import_value(f"{environment_name}:ECSCluster"),
            service_name="colorteller-blue-service",
            service_registries=[
                ecs.CfnService.ServiceRegistryProperty(
                    registry_arn=ColorTellerBlueServiceDiscoveryRecord.attr_arn
                )
            ],
            desired_count=1,
            launch_type="FARGATE",
            deployment_configuration=ecs.CfnService.DeploymentConfigurationProperty(
                maximum_percent=200,
                minimum_healthy_percent=100
            ),
            task_definition=core.Fn.import_value(f"{environment_name}:ColorTellerTaskDefinitionArn-blue"),
            tags=[{"key": "Name", "value": "ColorTellerBlue"}],
            network_configuration=ecs.CfnService.NetworkConfigurationProperty(
                awsvpc_configuration=ecs.CfnService.AwsVpcConfigurationProperty(
                    subnets=[core.Fn.import_value(f"{environment_name}:PrivateSubnet1"), core.Fn.import_value(f"{environment_name}:PrivateSubnet2")],
                    assign_public_ip="DISABLED",
                    security_groups=[core.Fn.import_value(f"{environment_name}:ECSServiceSecurityGroup")]
                )
            )
        )
        # Create a service record for the color teller red service
        ColorTellerRedServiceDiscoveryRecord = servicediscovery.CfnService(
            self, "ColorTellerRedServiceDiscovery",
            description="Service discovery for the red colorteller",
            tags=[{"key": "Name", "value": "ColorTellerRed"}],
            name="colorteller-red",
            dns_config=servicediscovery.CfnService.DnsConfigProperty(
                namespace_id=core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespaceID"),
                # routing_policy="MULTIVALUE",

                dns_records=[
                    servicediscovery.CfnService.DnsRecordProperty(
                        type="A",
                        ttl=300
                    )
                ],

            ),
            health_check_custom_config=servicediscovery.CfnService.HealthCheckCustomConfigProperty(
                failure_threshold=1
            )
        )
        # Create a service for the color teller red service 
        ColorTellerRedService = ecs.CfnService(
            self, "ColorTellerRedService",
            cluster=core.Fn.import_value(f"{environment_name}:ECSCluster"),
            service_name="colorteller-red-service",
            service_registries=[
                ecs.CfnService.ServiceRegistryProperty(
                    registry_arn=ColorTellerRedServiceDiscoveryRecord.attr_arn
                )
            ],
            desired_count=1,
            launch_type="FARGATE",
            deployment_configuration=ecs.CfnService.DeploymentConfigurationProperty(
                maximum_percent=200,
                minimum_healthy_percent=100
            ),
            task_definition=core.Fn.import_value(f"{environment_name}:ColorTellerTaskDefinitionArn-red"),
            tags=[{"key": "Name", "value": "ColorTellerRed"}],
            network_configuration=ecs.CfnService.NetworkConfigurationProperty(
                awsvpc_configuration=ecs.CfnService.AwsVpcConfigurationProperty(
                    subnets=[core.Fn.import_value(f"{environment_name}:PrivateSubnet1"), core.Fn.import_value(f"{environment_name}:PrivateSubnet2")],
                    assign_public_ip="DISABLED",
                    security_groups=[core.Fn.import_value(f"{environment_name}:ECSServiceSecurityGroup")]
                )
            )
        )
        # Create a service discovery record for the color teller black service 
        ColorTellerBlackServiceDiscoveryRecord = servicediscovery.CfnService(
            self, "ColorTellerBlackServiceDiscovery",
            description="Service discovery for the black colorteller",
            tags=[{"key": "Name", "value": "ColorTellerBlack"}],
            name="colorteller-black",
            dns_config=servicediscovery.CfnService.DnsConfigProperty(
                namespace_id=core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespaceID"),
                # routing_policy="MULTIVALUE",

                dns_records=[
                    servicediscovery.CfnService.DnsRecordProperty(
                        type="A",
                        ttl=300
                    )
                ],

            ),
            health_check_custom_config=servicediscovery.CfnService.HealthCheckCustomConfigProperty(
                failure_threshold=1
            )
        )
        # Create a service for the color teller black service 
        ColorTellerBlackService = ecs.CfnService(
            self, "ColorTellerBlackService",
            cluster=core.Fn.import_value(f"{environment_name}:ECSCluster"),
            service_name="colorteller-black-service",
            service_registries=[
                ecs.CfnService.ServiceRegistryProperty(
                    registry_arn=ColorTellerBlackServiceDiscoveryRecord.attr_arn
                )
            ],
            deployment_configuration=ecs.CfnService.DeploymentConfigurationProperty(
                maximum_percent=200,
                minimum_healthy_percent=100
            ),
            desired_count=1,
            launch_type="FARGATE",
            task_definition=core.Fn.import_value(f"{environment_name}:ColorTellerTaskDefinitionArn-black"),
            tags=[{"key": "Name", "value": "ColorTellerBlack"}],
            network_configuration=ecs.CfnService.NetworkConfigurationProperty(
                awsvpc_configuration=ecs.CfnService.AwsVpcConfigurationProperty(
                    subnets=[core.Fn.import_value(f"{environment_name}:PrivateSubnet1"), core.Fn.import_value(f"{environment_name}:PrivateSubnet2")],
                    assign_public_ip="DISABLED",
                    security_groups=[core.Fn.import_value(f"{environment_name}:ECSServiceSecurityGroup")]
                )
            )
        )
        # Create a service discovery record  for the color teller blue service 
        ColorGatewayServiceDiscoveryRecord = servicediscovery.CfnService(
            self, "ColorGatewayServiceDiscovery",
            description="Service discovery for the gateway colorteller",
            tags=[{"key": "Name", "value": "ColorGateway"}],
            name="colorgateway",
            dns_config=servicediscovery.CfnService.DnsConfigProperty(
                namespace_id=core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespaceID"),
                # routing_policy="MULTIVALUE",

                dns_records=[
                    servicediscovery.CfnService.DnsRecordProperty(
                        type="A",
                        ttl=300
                    )
                ],

            ),
            health_check_custom_config=servicediscovery.CfnService.HealthCheckCustomConfigProperty(
                failure_threshold=1
            )
        )
        ColorGatewayService = ecs.CfnService(
            self, "ColorGatewayService",
            cluster=core.Fn.import_value(f"{environment_name}:ECSCluster"),
            service_name="colorteller-gateway-service",
            service_registries=[
                ecs.CfnService.ServiceRegistryProperty(
                    registry_arn=ColorGatewayServiceDiscoveryRecord.attr_arn
                )
            ],
            desired_count=1,
            launch_type="FARGATE",
            task_definition=core.Fn.import_value(f"{environment_name}:ColorGatewayTaskDefinitionArn"),
            tags=[{"key": "Name", "value": "ColorGateway"}],
            deployment_configuration=ecs.CfnService.DeploymentConfigurationProperty(
                maximum_percent=200,
                minimum_healthy_percent=100
            ),
            network_configuration=ecs.CfnService.NetworkConfigurationProperty(
                awsvpc_configuration=ecs.CfnService.AwsVpcConfigurationProperty(
                    subnets=[core.Fn.import_value(f"{environment_name}:PrivateSubnet1"), core.Fn.import_value(f"{environment_name}:PrivateSubnet2")],
                    assign_public_ip="DISABLED",
                    security_groups=[core.Fn.import_value(f"{environment_name}:ECSServiceSecurityGroup")]
                )
            ),
            load_balancers=[
                ecs.CfnService.LoadBalancerProperty(
                    container_name="app",
                    container_port=9080,
                    target_group_arn=WebTargetGroup.attr_target_group_arn
                    
                )
            ]
        )
        
        
        TesterTaskDefinition = ecs.CfnTaskDefinition(
            self, "TesterTaskDefinition",
            family="tester",
            cpu="256",
            memory="512",
            network_mode="awsvpc",
            task_role_arn=core.Fn.import_value(f"{environment_name}:ECSTaskIamRole"),
            execution_role_arn=core.Fn.import_value(f"{environment_name}:TaskExecutionIamRole"),
            container_definitions=[
                ecs.CfnTaskDefinition.ContainerDefinitionProperty(
                    name="app",
                    image="tstrohmeier/alpine-infinite-curl",
                    memory_reservation=512,
                    essential=True,
                    command=[
                        core.Fn.sub("-h http://colorgateway.${ECSServicesDomain}:9080/color", {"ECSServicesDomain": core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespace")} )
                        
                    ],
                    log_configuration=ecs.CfnTaskDefinition.LogConfigurationProperty(
                        log_driver="awslogs",
                        options={
                            "awslogs-group": core.Fn.import_value(f"{environment_name}:ECSServicelogGroup"),
                            "awslogs-region": core.Aws.REGION,
                            "awslogs-stream-prefix": "tester-app"
                        }
                    ),
                )
            ]
        )

        TcpEchoServiceDiscoveryRecord = servicediscovery.CfnService(
            self, "TcpEchoServiceDiscovery",
            name="tcpecho",
            description="Service discovery for the tcp echo colorteller",
            tags=[{"key": "Name", "value": "TcpEcho"}],
            dns_config=servicediscovery.CfnService.DnsConfigProperty(
                namespace_id=core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespaceID"),
                # routing_policy="MULTIVALUE",

                dns_records=[
                    servicediscovery.CfnService.DnsRecordProperty(
                        type="A",
                        ttl=300
                    )
                ],

            ),
            health_check_custom_config=servicediscovery.CfnService.HealthCheckCustomConfigProperty(
                failure_threshold=1
            )
        )
        TcpEchoTaskDefinition = ecs.CfnTaskDefinition(
            self, "TcpEchoTaskDefinition",
            family="tcpecho",
            memory="512",
            requires_compatibilities=["FARGATE"],
            cpu="256",
            network_mode="awsvpc",
            task_role_arn=core.Fn.import_value(f"{environment_name}:ECSTaskIamRole"),
            execution_role_arn=core.Fn.import_value(f"{environment_name}:TaskExecutionIamRole"),
            container_definitions=[
                ecs.CfnTaskDefinition.ContainerDefinitionProperty(
                    name="app",
                    image="cjimti/go-echo",
                    log_configuration=ecs.CfnTaskDefinition.LogConfigurationProperty(
                        log_driver="awslogs",
                        options={
                            "awslogs-group": core.Fn.import_value(f"{environment_name}:ECSServicelogGroup"),
                            "awslogs-region": core.Aws.REGION,
                            "awslogs-stream-prefix": "tcpecho-app"
                        }
                    ),
                    port_mappings=[
                        ecs.CfnTaskDefinition.PortMappingProperty(
                            container_port=2701,
                            host_port=2701,
                            protocol="tcp"
                        )
                    ],
                    environment=[ecs.CfnTaskDefinition.KeyValuePairProperty(
                        name="TCP_PORT",
                        value="2701"
                    ),
                    ecs.CfnTaskDefinition.KeyValuePairProperty(
                        name="NODE_NAME",
                        value=core.Fn.sub(
                            "mesh/${AppMeshMeshName}/virtualNode/tcpecho-vn",
                            {"AppMeshMeshName": f"{environment_name}:Mesh"}
                        )
                    ),
                    ],
                    essential=True,
                    
                   
                )
            ]
        )
        TcpEchoService = ecs.CfnService(
            self, "TcpEchoService",
            cluster=core.Fn.import_value(f"{environment_name}:ECSCluster"),
            service_name="tcp-echo-service",
            service_registries=[
                ecs.CfnService.ServiceRegistryProperty(
                    registry_arn=TcpEchoServiceDiscoveryRecord.attr_arn
                )
            ],
            desired_count=1,
            launch_type="FARGATE",
            task_definition=TcpEchoTaskDefinition.attr_task_definition_arn, 
            tags=[{"key": "Name", "value": "TcpEcho"}],
            deployment_configuration=ecs.CfnService.DeploymentConfigurationProperty(
                maximum_percent=200,
                minimum_healthy_percent=100
            ),
            network_configuration=ecs.CfnService.NetworkConfigurationProperty(
                awsvpc_configuration=ecs.CfnService.AwsVpcConfigurationProperty(
                    subnets=[core.Fn.import_value(f"{environment_name}:PrivateSubnet1"), core.Fn.import_value(f"{environment_name}:PrivateSubnet2")],
                    assign_public_ip="DISABLED",
                    security_groups=[core.Fn.import_value(f"{environment_name}:ECSServiceSecurityGroup")]
                )
            )
        )
        # The following code creates the front-facing load balancer infrastructure
        PublicLoadBalancerSG = ec2.CfnSecurityGroup(
            self, "PublicLoadBalancerSG",
            vpc_id=core.Fn.import_value(f"{environment_name}:VPCID"),
            group_description="Access to the public facing load balancer",
            security_group_ingress=[ec2.CfnSecurityGroup.IngressProperty(
                cidr_ip="0.0.0.0/0",
                ip_protocol="tcp",
                from_port=80,
                to_port=80
            )]
        )
        PublicLoadBalancer = elbv2.CfnLoadBalancer(
            self, "PublicLoadBalancer",
            scheme="internet-facing",
            security_groups=[PublicLoadBalancerSG.ref],
            subnets=[core.Fn.import_value(f"{environment_name}:PublicSubnet1"), core.Fn.import_value(f"{environment_name}:PublicSubnet2")],
            tags=[{"key": "Name", "value": "PublicLoadBalancer"}],
            load_balancer_attributes=[elbv2.CfnLoadBalancer.LoadBalancerAttributeProperty(
               key="idle_timeout.timeout_seconds",
               value="30"
                

            )
            ]
            
        )
        WebTargetGroup = elbv2.CfnTargetGroup(
            self, "WebTargetGroup",
            health_check_interval_seconds=6,
            health_check_path="/ping",
            health_check_protocol="HTTP",
            health_check_timeout_seconds=5,
            healthy_threshold_count=2,
            target_type="ip",
            unhealthy_threshold_count=2,
            vpc_id=core.Fn.import_value(f"{environment_name}:VPCID"),
            port=80,
            protocol="HTTP",
            target_group_attributes=[elbv2.CfnTargetGroup.TargetGroupAttributeProperty(
                key="deregistration_delay.timeout_seconds",
                value="120",
            )],
            
        
           tags=[{"key": "Name", "value": "WebTargetGroup"}],
        )
        PublicLoadBalancerListener = elbv2.CfnListener(
            self, "PublicLoadBalancerListener",
            load_balancer_arn=PublicLoadBalancer.ref,
            port=80,
            protocol="HTTP",
            default_actions=[elbv2.CfnListener.ActionProperty(
                type="forward",
                target_group_arn=WebTargetGroup.attr_target_group_arn
            )],
            
        )
        WebLoadBalancerRule = elbv2.CfnListenerRule(
            self, "WebLoadBalancerRule",
            listener_arn=PublicLoadBalancerListener.ref,
            actions=[elbv2.CfnListenerRule.ActionProperty(
                type="forward",
                target_group_arn=WebTargetGroup.ref
            )],
            conditions=[elbv2.CfnListenerRule.RuleConditionProperty(
                field="path-pattern",
                values=["*"]
            )],
            priority=1,
        )
        PublicLoadBalancerListener.node.add_dependency(PublicLoadBalancerListener)
        ColorGatewayService.node.add_dependency(WebLoadBalancerRule)
        # Returns the public endpoint for the color app service to cURL against
        core.CfnOutput(
            self, "ColorAppEndpoint",
            description="Public endpoint for Color App Service",
            value=core.Fn.join("", ["http://", PublicLoadBalancer.attr_dns_name]),
            export_name="ColorAppEndpoint"
        )
        

