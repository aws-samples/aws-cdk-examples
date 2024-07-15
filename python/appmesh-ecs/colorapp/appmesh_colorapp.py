# give me a boilerplate cdk class for an appmesh stack with 6 virtual nodes, 1 virtual router, 1 appmesh route, and 2 virtual services. 
from aws_cdk import (
    aws_ec2 as ec2,
    aws_servicediscovery as servicediscovery,
)
from aws_cdk import Stack, Tags, App
from constructs import Construct
import aws_cdk as core
import aws_cdk.aws_ecs as ecs
import aws_cdk.aws_ecr as ecr
import aws_cdk.aws_dynamodb as dynamodb
import aws_cdk.aws_iam as iam
import aws_cdk.aws_appmesh as appmesh

class ServiceMeshColorAppStack(Stack):

    def __init__(self, scope: Construct, id: str, **kwargs, ) -> None:
        super().__init__(scope, id, **kwargs )
        environment_name ="appmesh-env"
        # The following creates the appmesh virtual nodes that are associated with each color in the namespace in Cloud Map
        ColorTellerBlackVirtualNode = appmesh.CfnVirtualNode(
        self, "ColorTellerBlackVirtualNode",
        mesh_name=core.Fn.import_value(f"{environment_name}:Mesh"),
        virtual_node_name="colorteller-black-vn",
        spec=appmesh.CfnVirtualNode.VirtualNodeSpecProperty(
            service_discovery=appmesh.CfnVirtualNode.ServiceDiscoveryProperty(
                dns=appmesh.CfnVirtualNode.DnsServiceDiscoveryProperty(
                    hostname=core.Fn.sub("colorteller-black.${ServicesDomain}", {"ServicesDomain": core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespace")})
                )
            ),
            listeners=[
                appmesh.CfnVirtualNode.ListenerProperty(
                    port_mapping=appmesh.CfnVirtualNode.PortMappingProperty(
                        port=9080,
                        protocol="http",
                    ),
                    health_check=appmesh.CfnVirtualNode.HealthCheckProperty(
                        healthy_threshold=2,
                        interval_millis=5000,
                        path="/ping",
                        port=9080,
                        protocol="http",
                        timeout_millis=2000,
                        unhealthy_threshold=2,
                        )
                    )
                ],
            ),
        )
        ColorTellerBlueVirtualNode = appmesh.CfnVirtualNode(
        self, "ColorTellerBlueVirtualNode",
        mesh_name=core.Fn.import_value(f"{environment_name}:Mesh"),
        virtual_node_name="colorteller-blue-vn",
        spec=appmesh.CfnVirtualNode.VirtualNodeSpecProperty(
            service_discovery=appmesh.CfnVirtualNode.ServiceDiscoveryProperty(
                dns=appmesh.CfnVirtualNode.DnsServiceDiscoveryProperty(
                    hostname=core.Fn.sub("colorteller-blue.${ServicesDomain}", {"ServicesDomain": core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespace")})
                )
            ),
            listeners=[
                appmesh.CfnVirtualNode.ListenerProperty(
                    port_mapping=appmesh.CfnVirtualNode.PortMappingProperty(
                        port=9080,
                        protocol="http",
                    ),
                    health_check=appmesh.CfnVirtualNode.HealthCheckProperty(
                        healthy_threshold=2,
                        interval_millis=5000,
                        path="/ping",
                        port=9080,
                        protocol="http",
                        timeout_millis=2000,
                        unhealthy_threshold=2,
                        )
                    )
                ]
            )
        )  
        ColorTellerRedVirtualNode = appmesh.CfnVirtualNode(
        self, "ColorTellerRedVirtualNode",
        mesh_name=core.Fn.import_value(f"{environment_name}:Mesh"),
        virtual_node_name="colorteller-red-vn",
        spec=appmesh.CfnVirtualNode.VirtualNodeSpecProperty(
            service_discovery=appmesh.CfnVirtualNode.ServiceDiscoveryProperty(
                dns=appmesh.CfnVirtualNode.DnsServiceDiscoveryProperty(
                    hostname=core.Fn.sub("colorteller-red.${ServicesDomain}", {"ServicesDomain": core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespace")})
                )
            ),
            listeners=[
                appmesh.CfnVirtualNode.ListenerProperty(
                    port_mapping=appmesh.CfnVirtualNode.PortMappingProperty(
                        port=9080,
                        protocol="http",
                    ),
                    health_check=appmesh.CfnVirtualNode.HealthCheckProperty(
                        healthy_threshold=2,
                        interval_millis=5000,
                        path="/ping",
                        port=9080,
                        protocol="http",
                        timeout_millis=2000,
                        unhealthy_threshold=2,
                        )
                    )
                ]
            )
        )
        ColorTellerWhiteVirtualNode = appmesh.CfnVirtualNode(
        self, "ColorTellerWhiteVirtualNode",
        mesh_name=core.Fn.import_value(f"{environment_name}:Mesh"),
        virtual_node_name="colorteller-white-vn",
        spec=appmesh.CfnVirtualNode.VirtualNodeSpecProperty(
            service_discovery=appmesh.CfnVirtualNode.ServiceDiscoveryProperty(
                dns=appmesh.CfnVirtualNode.DnsServiceDiscoveryProperty(
                    hostname=core.Fn.sub("colorteller.${ServicesDomain}", {"ServicesDomain": core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespace")})
                )
            ),
            listeners=[
                appmesh.CfnVirtualNode.ListenerProperty(
                    port_mapping=appmesh.CfnVirtualNode.PortMappingProperty(
                        port=9080,
                        protocol="http",
                    ),
                    health_check=appmesh.CfnVirtualNode.HealthCheckProperty(
                        healthy_threshold=2,
                        interval_millis=5000,
                        path="/ping",
                        port=9080,
                        protocol="http",
                        timeout_millis=2000,
                        unhealthy_threshold=2,
                        )
                    )
                ]
            )
        )
        ColorTellerVirtualRouter = appmesh.CfnVirtualRouter(
        self, "ColorTellerVirtualRouter",
        mesh_name=core.Fn.import_value(f"{environment_name}:Mesh"),
        virtual_router_name="colorteller-vr",
        spec=appmesh.CfnVirtualRouter.VirtualRouterSpecProperty(
            listeners=[
                appmesh.CfnVirtualRouter.VirtualRouterListenerProperty(
                    port_mapping=appmesh.CfnVirtualRouter.PortMappingProperty(
                        port=9080,
                        protocol="http",
                    )
                )
            ]
        )
        )  
        # Creates an app mesh route that distributes traffic across 3 targets when the gateway is hit
        ColorTellerRoute = appmesh.CfnRoute(
        self, "ColorTellerRoute",
        mesh_name=core.Fn.import_value(f"{environment_name}:Mesh"),
        virtual_router_name="colorteller-vr",
        route_name="colorteller-route",
        spec=appmesh.CfnRoute.RouteSpecProperty(
            http_route=appmesh.CfnRoute.HttpRouteProperty(
                action=appmesh.CfnRoute.HttpRouteActionProperty(
                    weighted_targets=[
                        appmesh.CfnRoute.WeightedTargetProperty(
                            virtual_node="colorteller-white-vn",
                            weight=1,
                        ),
                        appmesh.CfnRoute.WeightedTargetProperty(
                            virtual_node="colorteller-blue-vn",
                            weight=1,
                        ),
                        appmesh.CfnRoute.WeightedTargetProperty(
                            virtual_node="colorteller-red-vn",
                            weight=1,
                        ),

                    ],
                ),
                match=appmesh.CfnRoute.HttpRouteMatchProperty(
                    prefix="/",
                ),
            ),
        ),
        )
        ColorTellerRoute.node.add_dependency(ColorTellerVirtualRouter)
        ColorTellerRoute.node.add_dependency(ColorTellerWhiteVirtualNode)
        ColorTellerRoute.node.add_dependency(ColorTellerBlueVirtualNode)
        ColorTellerRoute.node.add_dependency(ColorTellerRedVirtualNode)

        # Creates a virtual service in app mesh that utilizes the virtual router
        ColorTellerVirtualService = appmesh.CfnVirtualService(
        self, "ColorTellerVirtualService",
        mesh_name=core.Fn.import_value(f"{environment_name}:Mesh"),
        virtual_service_name=core.Fn.sub("colorteller.${ServicesDomain}" , {"ServicesDomain": core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespace")}),
        spec=appmesh.CfnVirtualService.VirtualServiceSpecProperty(
            provider=appmesh.CfnVirtualService.VirtualServiceProviderProperty(
                virtual_router=appmesh.CfnVirtualService.VirtualRouterServiceProviderProperty(
                    virtual_router_name="colorteller-vr",
                ),
            ),
        ),
        )
        ColorTellerVirtualService.node.add_dependency(ColorTellerVirtualRouter)

        TcpEchoVirtualNode = appmesh.CfnVirtualNode(
        self, "TcpEchoVirtualNode",
        mesh_name=core.Fn.import_value(f"{environment_name}:Mesh"),
        virtual_node_name="tcpecho-vn",
        spec=appmesh.CfnVirtualNode.VirtualNodeSpecProperty(
            service_discovery=appmesh.CfnVirtualNode.ServiceDiscoveryProperty(
                dns=appmesh.CfnVirtualNode.DnsServiceDiscoveryProperty(
                    hostname=core.Fn.sub("tcpecho.${ServicesDomain}", {"ServicesDomain": core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespace")})
                )
            ),
            listeners=[
                appmesh.CfnVirtualNode.ListenerProperty(
                    port_mapping=appmesh.CfnVirtualNode.PortMappingProperty(
                        port=2701,
                        protocol="tcp",
                    ),
                    health_check=appmesh.CfnVirtualNode.HealthCheckProperty(
                        healthy_threshold=2,
                        interval_millis=5000,
                        protocol="tcp",
                        timeout_millis=2000,
                        unhealthy_threshold=2,
                        )
                    )
                ]
            )
        )   
        TCPEchoVirtualService = appmesh.CfnVirtualService(
        self, "TCPEchoVirtualService",
        mesh_name=core.Fn.import_value(f"{environment_name}:Mesh"),
        virtual_service_name=core.Fn.sub("tcpecho.${ServicesDomain}", {"ServicesDomain": core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespace")}),
        spec=appmesh.CfnVirtualService.VirtualServiceSpecProperty(
            provider=appmesh.CfnVirtualService.VirtualServiceProviderProperty(
                virtual_node=appmesh.CfnVirtualService.VirtualNodeServiceProviderProperty(
                    virtual_node_name="tcpecho-vn",
                ),
            ),
        ),
        )
        TCPEchoVirtualService.node.add_dependency(TcpEchoVirtualNode)
        # Creating a virtual node for the color teller gateway 
        ColorGatewayVirtualNode = appmesh.CfnVirtualNode(
        self, "ColorGatewayVirtualNode",
        mesh_name=core.Fn.import_value(f"{environment_name}:Mesh"),
        virtual_node_name="colorgateway-vn",
        spec=appmesh.CfnVirtualNode.VirtualNodeSpecProperty(
            service_discovery=appmesh.CfnVirtualNode.ServiceDiscoveryProperty(
                dns=appmesh.CfnVirtualNode.DnsServiceDiscoveryProperty(
                    hostname=core.Fn.sub("colorgateway.${ServicesDomain}", {"ServicesDomain": core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespace")})
                )
            ),
            listeners=[
                appmesh.CfnVirtualNode.ListenerProperty(
                    port_mapping=appmesh.CfnVirtualNode.PortMappingProperty(
                        port=9080,
                        protocol="http",
                    )
                    )
                ],
            backends=[
                appmesh.CfnVirtualNode.BackendProperty(
                virtual_service=
                appmesh.CfnVirtualNode.VirtualServiceBackendProperty(
                    virtual_service_name=core.Fn.sub("colorteller.${ServicesDomain}", {"ServicesDomain": core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespace")}),
                )
                
                
                
            ),
            appmesh.CfnVirtualNode.BackendProperty(
            virtual_service= appmesh.CfnVirtualNode.VirtualServiceBackendProperty(
                    virtual_service_name=core.Fn.sub("tcpecho.${ServicesDomain}", {"ServicesDomain": core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespace")}),
                )
            )
            ]
            )
        )
        