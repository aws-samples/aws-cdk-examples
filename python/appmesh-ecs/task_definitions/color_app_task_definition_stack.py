# give me a boilerplate cdk class 
import aws_cdk as core
import aws_cdk.aws_ec2 as ec2
import aws_cdk.aws_ecs as ecs
from aws_cdk import Stack, Tags, App
from constructs import Construct
class ColorAppTaskDefinitionStack(Stack):
   
   def __init__(self, scope: Construct, id: str, **kwargs, ) -> None:
        super().__init__(scope, id, **kwargs )
        environment_name ="appmesh-env"
        
        color_teller_colors = ["red", "black", "blue", "white"]
        for color in color_teller_colors:
            task_definition = self.create_color_task_definition(color, environment_name)
            core.CfnOutput(
            self, f"ColorTellerTaskDefinitionArn-{color}",
            value=task_definition.attr_task_definition_arn,
            export_name=f"{environment_name}:ColorTellerTaskDefinitionArn-{color}"
            )
           
            
        
        colorGatewayTaskDefinition = ecs.CfnTaskDefinition(
            self, "colorGatewayTask",
            family=f"{environment_name}-ColorGateway",
            network_mode="awsvpc",
            memory="512",
            requires_compatibilities=["FARGATE"],
            cpu="256",
            proxy_configuration=
                ecs.CfnTaskDefinition.ProxyConfigurationProperty(
                    container_name="envoy",
                    type="APPMESH",
                    proxy_configuration_properties=[
                        ecs.CfnTaskDefinition.KeyValuePairProperty(
                            name="IgnoredUID",
                            value="1337"
                        ),
                        ecs.CfnTaskDefinition.KeyValuePairProperty(
                            name="ProxyIngressPort",
                            value="15000"
                        ),
                        ecs.CfnTaskDefinition.KeyValuePairProperty(
                            name="ProxyEgressPort",
                            value="15001"
                        ),
                        ecs.CfnTaskDefinition.KeyValuePairProperty(
                            name="AppPorts",
                            value="9080"
                        ),
                        ecs.CfnTaskDefinition.KeyValuePairProperty(
                            name="EgressIgnoredIPs",
                            value="169.254.170.2,169.254.169.254"
                        )
                    ]
                ),
            container_definitions=[
                ecs.CfnTaskDefinition.ContainerDefinitionProperty(
                    name="app",
                    image=f"{core.Aws.ACCOUNT_ID}.dkr.ecr.{core.Aws.REGION}.amazonaws.com/gateway:latest",
                    # memory=256,
                    # cpu=128,
                    port_mappings=[
                        ecs.CfnTaskDefinition.PortMappingProperty(
                            container_port=9080,
                            host_port=9080,
                            protocol="tcp"
                        )
                    ],
                    environment=[
                    ecs.CfnTaskDefinition.KeyValuePairProperty(
                        name="SERVER_PORT",
                        value="9080"
                    ),
                    ecs.CfnTaskDefinition.KeyValuePairProperty(
                        name="COLOR_TELLER_ENDPOINT",
                        value=core.Fn.sub("colorteller.${SERVICES_DOMAIN}:9080", {"SERVICES_DOMAIN": core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespace")})
                    ),
                    ecs.CfnTaskDefinition.KeyValuePairProperty(
                        name="TCP_ECHO_ENDPOINT",
                        value=core.Fn.sub("tcpecho.${SERVICES_DOMAIN}:2701", {"SERVICES_DOMAIN": core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespace")})
                    )
                    
                ],
                    log_configuration=ecs.CfnTaskDefinition.LogConfigurationProperty(
                        log_driver="awslogs",
                        options={
                            "awslogs-group": core.Fn.import_value(f"{environment_name}:ECSServicelogGroup"),
                            "awslogs-region": core.Aws.REGION,
                            "awslogs-stream-prefix": "colorteller-gateway"
                        }
                    ),
                    essential=True,
                    depends_on=[
                        ecs.CfnTaskDefinition.ContainerDependencyProperty(
                            container_name="envoy",
                            condition="HEALTHY"
                        )
                    ],
                    
                
                ),
                ecs.CfnTaskDefinition.ContainerDefinitionProperty(
                name="envoy",
                user="1337",
                essential=True,
                # cpu=128,
                image=core.Fn.sub("840364872350.dkr.ecr.${Region}.amazonaws.com/aws-appmesh-envoy:v1.29.5.0-prod",{"Region": core.Aws.REGION}),
                port_mappings=[
                    ecs.CfnTaskDefinition.PortMappingProperty(
                    container_port=9901,
                    host_port=9901,
                    protocol="tcp"
                    ),
                    ecs.CfnTaskDefinition.PortMappingProperty(
                    container_port=15000,
                    host_port=15000,
                    protocol="tcp"
                    ),
                    ecs.CfnTaskDefinition.PortMappingProperty(
                    container_port=15001,
                    host_port=15001,
                    protocol="tcp"
                    ),
                
                ],
                ulimits=[ecs.CfnTaskDefinition.UlimitProperty(
                    hard_limit=15000,
                    name="nofile",
                    soft_limit=15000
                )],
                environment=[
                    ecs.CfnTaskDefinition.KeyValuePairProperty(
                        name="APPMESH_RESOURCE_ARN",
                        value=core.Fn.sub("mesh/${MeshName}/virtualNode/${app_name}-vn", {"MeshName": core.Fn.import_value(f"{environment_name}:Mesh"),"app_name": "colorgateway" })
                    ),
                    ecs.CfnTaskDefinition.KeyValuePairProperty(
                        name="ENVOY_LOG_LEVEL",
                        value="DEBUG"
                    ),
                    ecs.CfnTaskDefinition.KeyValuePairProperty(
                        name="ENABLE_ENVOY_XRAY_TRACING",
                        value="1"
                    ),
                    ecs.CfnTaskDefinition.KeyValuePairProperty(
                        name="ENABLE_ENVOY_STATS_TAGS",
                        value="1"
                    )
                ],
                log_configuration=ecs.CfnTaskDefinition.LogConfigurationProperty(
                log_driver="awslogs",
                options={
                    "awslogs-group": core.Fn.import_value(f"{environment_name}:ECSServicelogGroup"),
                    "awslogs-region": core.Aws.REGION,
                    "awslogs-stream-prefix": f"{environment_name}-envoy"
                }
            
            ),
            health_check=ecs.CfnTaskDefinition.HealthCheckProperty(
                command=["CMD-SHELL", "curl -s http://localhost:9901/server_info | grep state | grep -q LIVE"],
                interval=5,
                retries=3,
                timeout=2
            
            ),
            
        
            ),
            ecs.CfnTaskDefinition.ContainerDefinitionProperty(
                name="xrayContainer",
                # cpu=32,
                image="amazon/aws-xray-daemon",
                user="1337",
                port_mappings=[ecs.CfnTaskDefinition.PortMappingProperty(
                    container_port=2000,
                    host_port=2000,
                    protocol="udp"
                )],
                memory_reservation=256,
                log_configuration=ecs.CfnTaskDefinition.LogConfigurationProperty(
                    log_driver="awslogs",
                    options={
                        "awslogs-group": core.Fn.import_value(f"{environment_name}:ECSServicelogGroup"),
                        "awslogs-region": core.Aws.REGION,
                        "awslogs-stream-prefix": f"colorteller={color}-xray"
                    }
                ),
            )
            ],
            task_role_arn=core.Fn.import_value(f"{environment_name}:ECSTaskIamRole"),
            execution_role_arn=core.Fn.import_value(f"{environment_name}:TaskExecutionIamRole"),
            
            
        )
        core.CfnOutput(
            self, "ColorGatewayTaskDefinitionArn",
            value=colorGatewayTaskDefinition.attr_task_definition_arn,
            export_name=f"{environment_name}:ColorGatewayTaskDefinitionArn"
        )
        
       
            
   def create_color_task_definition(self, color, environment_name):
        return ecs.CfnTaskDefinition(
            self, f"colorTellerTask-{color}",
            # name=f"{environment_name}-ColorTeller-{color}",
            family=f"{environment_name}-ColorTeller-{color}",
            network_mode="awsvpc",
            memory="512",
            requires_compatibilities=["FARGATE"],
            cpu="256",
            proxy_configuration=ecs.CfnTaskDefinition.ProxyConfigurationProperty(
                container_name="envoy",
                type="APPMESH",  
                proxy_configuration_properties=[
                            ecs.CfnTaskDefinition.KeyValuePairProperty(
                                
                                name="IgnoredUID",
                                value="1337"
                            ),
                            ecs.CfnTaskDefinition.KeyValuePairProperty(
                                name="ProxyIngressPort",
                                value="15000"
                            ),
                            ecs.CfnTaskDefinition.KeyValuePairProperty(
                                name="ProxyEgressPort",
                                value="15001"
                            ),
                            ecs.CfnTaskDefinition.KeyValuePairProperty(
                                name="AppPorts",
                                value="9080"
                            ),
                            ecs.CfnTaskDefinition.KeyValuePairProperty(
                                name="EgressIgnoredIPs",
                                value="169.254.170.2,169.254.169.254"
                            )
                            
                            
                            ]
            ),
            container_definitions=[ecs.CfnTaskDefinition.ContainerDefinitionProperty(
                name="app",
                image=f"{core.Aws.ACCOUNT_ID}.dkr.ecr.{core.Aws.REGION}.amazonaws.com/colorteller:latest",
                essential=True,
                # cpu=128,
                port_mappings=[ecs.CfnTaskDefinition.PortMappingProperty(
                    container_port=9080,
                    host_port=9080,
                    protocol="tcp"
                )],
                environment=[
                    ecs.CfnTaskDefinition.KeyValuePairProperty(
                        name="COLOR",
                        value=color
                    ),
                    ecs.CfnTaskDefinition.KeyValuePairProperty(
                        name="SERVER_PORT",
                        value="9080"
                    ),
                    # ecs.CfnTaskDefinition.KeyValuePairProperty(
                    #     name="STAGE",
                    #     value=F"{app_mesh_stage}"
                    # ),
                    
                ],
                log_configuration=ecs.CfnTaskDefinition.LogConfigurationProperty(
                    log_driver="awslogs",
                    options={
                        "awslogs-group": core.Fn.import_value(f"{environment_name}:ECSServicelogGroup"),
                        "awslogs-region": core.Aws.REGION,
                        "awslogs-stream-prefix": f"colorteller={color}-app"
                    }
                ),
                depends_on=[
                    ecs.CfnTaskDefinition.ContainerDependencyProperty(
                        container_name="envoy",
                        condition="HEALTHY"
                    )
                ]
               
            ),
            ecs.CfnTaskDefinition.ContainerDefinitionProperty(
                name="envoy",
                user="1337",
                # cpu=128,
                essential=True,
                image=core.Fn.sub("840364872350.dkr.ecr.${Region}.amazonaws.com/aws-appmesh-envoy:v1.29.5.0-prod",{"Region": core.Aws.REGION}),
                port_mappings=[
                    ecs.CfnTaskDefinition.PortMappingProperty(
                    container_port=9901,
                    host_port=9901,
                    protocol="tcp"
                    ),
                    ecs.CfnTaskDefinition.PortMappingProperty(
                    container_port=15000,
                    host_port=15000,
                    protocol="tcp"
                    ),
                    ecs.CfnTaskDefinition.PortMappingProperty(
                    container_port=15001,
                    host_port=15001,
                    protocol="tcp"
                    ),
                
                ],
                ulimits=[ecs.CfnTaskDefinition.UlimitProperty(
                    hard_limit=15000,
                    name="nofile",
                    soft_limit=15000
                )],
                environment=[
                    ecs.CfnTaskDefinition.KeyValuePairProperty(
                        name="APPMESH_RESOURCE_ARN",
                        value=core.Fn.sub("mesh/${MeshName}/virtualNode/colorteller-${app_name}-vn", {"MeshName": core.Fn.import_value(f"{environment_name}:Mesh"),"app_name": color })
                    ),
                    ecs.CfnTaskDefinition.KeyValuePairProperty(
                        name="ENVOY_LOG_LEVEL",
                        value="DEBUG"
                    ),
                    ecs.CfnTaskDefinition.KeyValuePairProperty(
                        name="ENABLE_ENVOY_XRAY_TRACING",
                        value="1"
                    ),
                    ecs.CfnTaskDefinition.KeyValuePairProperty(
                        name="ENABLE_ENVOY_STATS_TAGS",
                        value="1"
                    )
                ],
                log_configuration=ecs.CfnTaskDefinition.LogConfigurationProperty(
                log_driver="awslogs",
                options={
                    "awslogs-group": core.Fn.import_value(f"{environment_name}:ECSServicelogGroup"),
                    "awslogs-region": core.Aws.REGION,
                    "awslogs-stream-prefix": f"{environment_name}-envoy"
                }
            
            ),
            health_check=ecs.CfnTaskDefinition.HealthCheckProperty(
                command=["CMD-SHELL", "curl -s http://localhost:9901/server_info | grep state | grep -q LIVE"],
                interval=5,
                retries=3,
                timeout=2
            
            )
            ),
            ecs.CfnTaskDefinition.ContainerDefinitionProperty(
                name="xrayContainer",
                # cpu=32,
                image="amazon/aws-xray-daemon",
                user="1337",
                port_mappings=[ecs.CfnTaskDefinition.PortMappingProperty(
                    container_port=2000,
                    host_port=2000,
                    protocol="udp"
                )],
                memory_reservation=256,
                log_configuration=ecs.CfnTaskDefinition.LogConfigurationProperty(
                    log_driver="awslogs",
                    options={
                        "awslogs-group": core.Fn.import_value(f"{environment_name}:ECSServicelogGroup"),
                        "awslogs-region": core.Aws.REGION,
                        "awslogs-stream-prefix": f"colorteller={color}-xray"
                    }
                ),
            )
            ],
            
            # log_configuration=ecs.CfnTaskDefinition.LogConfigurationProperty(
            #     log_driver="awslogs",
            #     options={
            #         "awslogs-group": core.Fn.import_value(f"{environment_name}:ECSServiceLogGroup"),
            #         "awslogs-region": core.Aws.REGION,
            #         "awslogs-stream-prefix": f"{environment_name}-colorTeller-app"
            #     }
            # ),
            task_role_arn=core.Fn.import_value(f"{environment_name}:ECSTaskIamRole"),
            execution_role_arn=core.Fn.import_value(f"{environment_name}:TaskExecutionIamRole"),
        )
       
            # task_role_arn=core.Fn.import_value(f"{environment_name}:TaskRoleArn"),
            # execution_role_arn=core.Fn.import_value(f"{environment_name}:ExecutionRoleArn"),
            # tags={
            #     "Name": "xrayContainer"
            # })
        
        
        