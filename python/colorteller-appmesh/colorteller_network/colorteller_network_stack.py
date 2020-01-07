from aws_cdk import core, aws_ec2


class ColorTellerNetworkStack(core.Stack):

    def __init__(self, scope, id, **kwarg) -> None:
        super().__init__(scope, id, **kwarg)

        # creates a vpc
        self.network_vpc = aws_ec2.Vpc(self, "colorteller-vpc",
                                       enable_dns_hostnames=True,
                                       enable_dns_support=True,
                                       max_azs=2,
                                       )
        # adds ecs endpoint to VPC
        self.network_vpc.add_interface_endpoint(
            'ECS_Agent', service=aws_ec2.InterfaceVpcEndpointAwsService.ECS_AGENT)
