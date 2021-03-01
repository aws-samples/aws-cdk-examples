import os

from aws_cdk import (
    core,
)
from vpc import IsolatedVpc
from vpc import PublicVpc
from peering import VpcPeering
from ec2 import Ec2

env = core.Environment(account=os.environ['CDK_DEFAULT_ACCOUNT'],region="ap-northeast-2")

app = core.App()
props = {'namespace': app.node.try_get_context('namespace')}

# VPCs
isolated_vpc = IsolatedVpc(app, f"{props['namespace']}-isolated-vpc", props, cidr="10.11.0.0/16", env=env)
public_vpc = PublicVpc(app, f"{props['namespace']}-public-vpc", props, cidr="10.10.0.0/16", env=env)

peering = VpcPeering(app, f"{props['namespace']}-peering", props,
  vpc_id=isolated_vpc.outputs['vpc'].vpc_id,
  vpc_route_table_id=isolated_vpc.outputs['vpc'].isolated_subnets[0].route_table.route_table_id,
  vpc_route_dest=public_vpc.outputs['vpc'].vpc_cidr_block,
  peer_vpc_id=public_vpc.outputs['vpc'].vpc_id,
  peer_vpc_route_table_id=public_vpc.outputs['vpc'].public_subnets[0].route_table.route_table_id,
  peer_vpc_route_dest=isolated_vpc.outputs['vpc'].vpc_cidr_block,
  env=env)

instance_a = Ec2(app, f"{props['namespace']}-ec2a", props, isolated_vpc.outputs['vpc'], public_vpc.outputs['vpc'].vpc_cidr_block, env=env)
instance_b = Ec2(app, f"{props['namespace']}-ec2b", props, public_vpc.outputs['vpc'], isolated_vpc.outputs['vpc'].vpc_cidr_block, env=env)

app.synth()
