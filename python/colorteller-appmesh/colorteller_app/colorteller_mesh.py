from aws_cdk import core, aws_appmesh, aws_route53


class ColorTellerAppMeshStack(core.Stack):

    def __init__(self, scope, id, vpc, **kwarg) -> None:
        super().__init__(scope, id, **kwarg)

        # creates mesh with allow all egress filter
        mesh = aws_appmesh.Mesh(self, "colorteller-app-mesh",
                                egress_filter=aws_appmesh.MeshFilterType.ALLOW_ALL, mesh_name="ColorTellerAppMesh")

        # general port maps
        node_port_mapping = aws_appmesh.PortMapping(
            port=9080, protocol=aws_appmesh.Protocol.HTTP)
        echo_port_mapping = aws_appmesh.PortMapping(
            port=2701, protocol=aws_appmesh.Protocol.HTTP)

        # general health_check
        node_health_check = aws_appmesh.HealthCheck(
            protocol=aws_appmesh.Protocol.HTTP, path="/ping", healthy_threshold=2, unhealthy_threshold=2, timeout=core.Duration.millis(2000), interval=core.Duration.millis(5000)
        )

        # sets up app mesh nodes
        black_node = aws_appmesh.VirtualNode(
            self, "colorteller-black-vn", mesh=mesh, dns_host_name="black.svc.test.local", virtual_node_name="black")
        black_node.add_listeners(aws_appmesh.VirtualNodeListener(
            port_mapping=node_port_mapping, health_check=node_health_check))

        blue_node = aws_appmesh.VirtualNode(
            self, "colorteller-blue-vn", mesh=mesh, dns_host_name="blue.svc.test.local", virtual_node_name="blue")
        blue_node.add_listeners(aws_appmesh.VirtualNodeListener(
            port_mapping=node_port_mapping, health_check=node_health_check))

        red_node = aws_appmesh.VirtualNode(
            self, "colorteller-red-vn", mesh=mesh, dns_host_name="red.svc.test.local", virtual_node_name="red")
        red_node.add_listeners(aws_appmesh.VirtualNodeListener(
            port_mapping=node_port_mapping, health_check=node_health_check))

        white_node = aws_appmesh.VirtualNode(
            self, "colorteller-white-vn", mesh=mesh, dns_host_name="white.svc.test.local", virtual_node_name="white")
        white_node.add_listeners(aws_appmesh.VirtualNodeListener(
            port_mapping=node_port_mapping, health_check=node_health_check))

        echo_node = aws_appmesh.VirtualNode(
            self, "colorteller-echo-vn", mesh=mesh, dns_host_name="tcpecho.svc.test.local", virtual_node_name="echo")
        echo_node.add_listeners(aws_appmesh.VirtualNodeListener(
            port_mapping=echo_port_mapping,
            health_check=aws_appmesh.HealthCheck(
                protocol=aws_appmesh.Protocol.HTTP, path="/ping", healthy_threshold=2, unhealthy_threshold=2, timeout=core.Duration.millis(2000), interval=core.Duration.millis(5000)
            )
        ))

        # sets up virtual router with weighted targets set to evenly distribute
        colorteller_rtr = aws_appmesh.VirtualRouter(
            self, "colorteller-virtual-router", mesh=mesh, listener=aws_appmesh.Listener(port_mapping=node_port_mapping), virtual_router_name="colorteller-rtr")
        colorteller_rtr.add_route("colorteller-route", prefix="/", route_targets=[
            aws_appmesh.WeightedTargetProps(
                virtual_node=black_node,
                weight=1),
            aws_appmesh.WeightedTargetProps(
                virtual_node=blue_node,
                weight=1),
            aws_appmesh.WeightedTargetProps(
                virtual_node=red_node,
                weight=1),
            aws_appmesh.WeightedTargetProps(
                virtual_node=white_node,
                weight=1)
        ]
        )

        # sets up the app mesh services to point to the routes or nodes
        mesh_vs = aws_appmesh.VirtualService(
            self, "colorteller-virtual-service", mesh=mesh, virtual_service_name="colorteller.svc.test.local", virtual_router=colorteller_rtr)

        echo_vs = aws_appmesh.VirtualService(
            self, "colorteller-echo-virtual-service", mesh=mesh, virtual_service_name="tcpecho.svc.test.local", virtual_node=echo_node)

        # sets the gateway node and adds the virtual services as backends.
        gateway_node = aws_appmesh.VirtualNode(self, "colorteller-gateway-vn", mesh=mesh, cloud_map_service=None,
                                               cloud_map_service_instance_attributes=None, dns_host_name="gateway.svc.test.local", virtual_node_name="gateway")
        gateway_node.add_listeners(aws_appmesh.VirtualNodeListener(
            port_mapping=node_port_mapping, health_check=node_health_check))
        gateway_node.add_backends(mesh_vs)
        gateway_node.add_backends(echo_vs)
