from aws_cdk import CfnOutput, Stack
from aws_cdk.aws_ec2 import Vpc, NatProvider, SubnetConfiguration, SubnetType
from constructs import Construct

class NetworkStack(Stack):

    def __init__(self, scope: Construct, id: str, props, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # Subnet configurations for a public and private tier
        subnet1 = SubnetConfiguration(
                name="Public",
                subnet_type=SubnetType.PUBLIC,
                cidr_mask=24)
        subnet2 = SubnetConfiguration(
                name="Private",
                subnet_type=SubnetType.PRIVATE_WITH_NAT,
                cidr_mask=24)

        vpc = Vpc(self,
                  "TheVPC",
                  cidr="10.0.0.0/16",
                  enable_dns_hostnames=True,
                  enable_dns_support=True,
                  max_azs=2,
                  nat_gateway_provider=NatProvider.gateway(),
                  nat_gateways=1,
                  subnet_configuration=[subnet1, subnet2]
                  )

        # This will export the VPC's ID in CloudFormation under the key
        # 'vpcid'
        CfnOutput(self, "vpcid", value=vpc.vpc_id)

        # Prepares output attributes to be passed into other stacks
        # In this case, it is our VPC and subnets.
        self.output_props = props.copy()
        self.output_props['vpc'] = vpc
        self.output_props['subnets'] = vpc.public_subnets

    @property
    def outputs(self):
        return self.output_props
