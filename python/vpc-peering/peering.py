from aws_cdk import (
    aws_ec2 as ec2,
    core,
)

class VpcPeeringConnection(ec2.CfnVPCPeeringConnection):
    def __init__(self, scope, id, **kwargs):
        super().__init__(scope, id, **kwargs)

class VpcPeering(core.Stack):
    def __init__(self, scope: core.Construct, id: str, props,
                 vpc_id: str, vpc_route_table_id: str, vpc_route_dest: str,
                 peer_vpc_id: str, peer_vpc_route_table_id: str, peer_vpc_route_dest: str,
                 **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # vpc peering
        peering = VpcPeeringConnection(
            self, "vpc_peering_connection",
            vpc_id=vpc_id,
            peer_vpc_id=peer_vpc_id,
        )
        self.vpc_peer_ref=peering.ref

        self.output_props=props.copy()
        self.output_props['vpc_peer_ref']=peering.ref

        # peering route table
        ec2.CfnRoute(self, "route_to_peer_vpc",
            route_table_id=vpc_route_table_id,
            destination_cidr_block=vpc_route_dest,
            vpc_peering_connection_id=self.vpc_peer_ref
        )

        ec2.CfnRoute(self, "route_to_vpc",
            route_table_id=peer_vpc_route_table_id,
            destination_cidr_block=peer_vpc_route_dest,
            vpc_peering_connection_id=self.vpc_peer_ref
        )

    # pass objects to another stack
    @property
    def outputs(self):
        return self.output_props
