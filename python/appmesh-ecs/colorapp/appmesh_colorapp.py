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
    # This function creates the virtual nodes in app mesh that correspond to each color
    def createVirtualNodes(stack: core.Stack, color: str, environment_name: str, mesh):
        environment_name ="appmesh-env"
        return appmesh.VirtualNode(
            scope=stack,
            id=f"VirtualNode-{color}",
            mesh=mesh,
            virtual_node_name=f"colorteller-{color}-vn",
            
            listeners=[
                       appmesh.VirtualNodeListener.http(
                           port=9080,
                           health_check=appmesh.HealthCheck.http(
                               healthy_threshold=3,
                               unhealthy_threshold=2,
                               timeout=core.Duration.millis(2000),
                               interval=core.Duration.millis(5000),
                               path="/ping",
                           ),
                       )],
            service_discovery=appmesh.ServiceDiscovery.dns(
                hostname=core.Fn.sub(
                        "colorteller-${color}.${ServicesDomain}",
                                    {
                                        "color": str(color),
                                        "ServicesDomain": core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespace")
                                    }
                                )

                 
        )
        )
            

    def __init__(self, scope: Construct, id: str, **kwargs, ) -> None:
        super().__init__(scope, id, **kwargs )
        environment_name ="appmesh-env"
        my_mesh = appmesh.Mesh.from_mesh_name(self, "Mesh", mesh_name=core.Fn.import_value(f"{environment_name}:Mesh"))
        color_teller_colors = ["red", "black", "blue"]
        virtual_nodes = []
        for color in color_teller_colors:
            virtual_nodes.append(self.createVirtualNodes(color, environment_name, my_mesh))

        ColorTellerVirtualRouter = appmesh.VirtualRouter(
            self, "ColorTellerVirtualRouter",
            mesh=my_mesh,
            virtual_router_name="colorteller-vr",
            listeners=[appmesh.VirtualRouterListener.http(port=9080)]
            
        )
                    
        # Creates an app mesh route that distributes traffic across 3 targets when the gateway is hit
       
        ColorTellerVirtualRouter.add_route(
            "MyRoute",        
            route_name="colorteller-route",
            route_spec=appmesh.RouteSpec.http(
                weighted_targets=[
                    appmesh.WeightedTarget(
                        virtual_node=virtual_nodes[0],
                        port=9080,
                        weight=1
                    ),
                    appmesh.WeightedTarget(
                        virtual_node=virtual_nodes[1],
                        port=9080,
                        weight=1
                    ),
                    appmesh.WeightedTarget(
                        virtual_node=virtual_nodes[2],
                        port=9080,
                        weight=1
                    )
                ],
                match=appmesh.HttpRouteMatch(
                    path=appmesh.HttpRoutePathMatch.starts_with("/")
                )
            )
        )
       
        CollorTellerVirtualService = appmesh.VirtualService(
             self, "ColorTellerService",
             virtual_service_provider=appmesh.VirtualServiceProvider.virtual_router(virtual_router=ColorTellerVirtualRouter),
             virtual_service_name=core.Fn.sub("colorteller.${ServicesDomain}" , {"ServicesDomain": core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespace")}),
             
             
        )
        ColorTellerWhiteVirtualNode = appmesh.VirtualNode(
            self, "ColorTellerWhiteVirtualNode",
            mesh=my_mesh,
            virtual_node_name=f"colorteller-white-vn",
            
            listeners=[
                       appmesh.VirtualNodeListener.http(
                           port=9080,
                           health_check=appmesh.HealthCheck.http(
                               healthy_threshold=3,
                               unhealthy_threshold=2,
                               timeout=core.Duration.millis(2000),
                               interval=core.Duration.millis(5000),
                               path="/ping",
                           ),
                       )],
            service_discovery=appmesh.ServiceDiscovery.dns(
                hostname=core.Fn.sub("colorteller.${ServicesDomain}",{"ServicesDomain": core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespace")})
            )

                 
        )

        
        TcpEchoVirtualNode = appmesh.VirtualNode(
            self, "TcpEchoVirtualNode",
            mesh=my_mesh,
            virtual_node_name=f"tcpecho-vn",

            listeners=[
                appmesh.VirtualNodeListener.tcp(port=2701),
                appmesh.VirtualNodeListener.tcp(
                    health_check=appmesh.HealthCheck.tcp(
                        healthy_threshold=2,
                        unhealthy_threshold=2,
                        timeout=core.Duration.millis(2000),
                        interval=core.Duration.millis(5000),
                
                        ),
                )

            ],
            service_discovery=appmesh.ServiceDiscovery.dns(
                hostname=core.Fn.sub("tcpecho.${ServicesDomain}", {"ServicesDomain": core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespace")})
            ),

        )
        TCPEchoVirtualService = appmesh.VirtualService(
            self, "TCPEchoVirtualService",
            virtual_service_provider=appmesh.VirtualServiceProvider.virtual_node(TcpEchoVirtualNode),
            virtual_service_name=core.Fn.sub("tcpecho.${ServicesDomain}", {"ServicesDomain": core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespace")}),

        )

        ColorGatewayVirtualNode = appmesh.VirtualNode(
            self, "ColorGatewayVirtualNode",
            mesh=my_mesh,
            virtual_node_name=f"colorgateway-vn",

            listeners=[appmesh.VirtualNodeListener.http(port=9080)],
            service_discovery=appmesh.ServiceDiscovery.dns(
                hostname=core.Fn.sub("colorgateway.${ServicesDomain}", {"ServicesDomain": core.Fn.import_value(f"{environment_name}:ECSServiceDiscoveryNamespace")})
            ),
            
            
        )
        ColorGatewayVirtualNode.add_backend(appmesh.Backend.virtual_service(CollorTellerVirtualService))
        ColorGatewayVirtualNode.add_backend(appmesh.Backend.virtual_service(TCPEchoVirtualService))