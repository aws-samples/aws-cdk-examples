from aws_cdk import (
    aws_ec2,
    core,
)
import itertools


class Base(core.Stack):
    def __init__(self, app: core.App, id: str, props, **kwargs) -> None:
        super().__init__(app, id, **kwargs)
        public_private_selection = [aws_ec2.SubnetSelection(subnet_type=aws_ec2.SubnetType.PUBLIC),
                                    #aws_ec2.SubnetSelection(subnet_type=aws_ec2.SubnetType.PRIVATE),
                                    aws_ec2.SubnetSelection(subnet_type=aws_ec2.SubnetType.ISOLATED)
                                    ]
        vpc = aws_ec2.Vpc(
            self, 'vpc',
            cidr='10.0.0.0/20',
            max_azs=4,
            enable_dns_hostnames=True,
            enable_dns_support=True,
            nat_gateways=0,  # default is 1 per az
            subnet_configuration=[
                aws_ec2.SubnetConfiguration(name='PUBLIC,', subnet_type=aws_ec2.SubnetType.PUBLIC, cidr_mask=24),
                #aws_ec2.SubnetConfiguration(name='PRIVATE,', subnet_type=aws_ec2.SubnetType.PRIVATE, cidr_mask=24),
                aws_ec2.SubnetConfiguration(name='ISOLATED,', subnet_type=aws_ec2.SubnetType.ISOLATED, cidr_mask=24)

            ],
            gateway_endpoints={
                'S3': {'service': aws_ec2.GatewayVpcEndpointAwsService.S3,
                       'subnets': public_private_selection},
                'DynamoDB': {'service': aws_ec2.GatewayVpcEndpointAwsService.DYNAMODB,
                             'subnets': public_private_selection}
            }

        )
        # with private subnets
        #vpc_subnets_list = [vpc.public_subnets, vpc.private_subnets, vpc.isolated_subnets]

        # no private subnets
        vpc_subnets_list = [vpc.public_subnets, vpc.isolated_subnets]

        # uncomment for a kms endpoint
        # kms_endpoint = aws_ec2.InterfaceVpcEndpoint(
        #     self, 'KMSEndpoint',
        #     vpc=vpc,
        #     subnets=aws_ec2.SubnetSelection(subnet_type=aws_ec2.SubnetType.ISOLATED),
        #     service=aws_ec2.InterfaceVpcEndpointAwsService.KMS,
        #     private_dns_enabled=True
        # )

        included_resources = ["AWS::EC2::Subnet"]
        excluded_resources = ["AWS::EC2::EIP"]

        vpc_subnets_list = list(itertools.chain.from_iterable(vpc_subnets_list))

        # for i in vpc_subnets_list:
        #     core.Tags.of(i).add('namespace', props['namespace'])



        # index = 1
        # if vpc.private_subnets:
        #     for i in vpc.private_subnets:
        #         core.Tags.of(i).add('SubnetTier', 'Private')
        #         core.Tags.of(i).add('Network', 'Private')
        #         include_resource_types = ["AWS::EC2::Subnet"]
        #         core.CfnOutput(
        #             self, f"PrivateSubnet{index}",
        #             value=i.subnet_id,
        #             description="PrivateSubnetId"
        #         )
        #         index += 1


        index = 1
        for i in vpc.public_subnets:
            core.Tags.of(i).add('SubnetTier', 'Public')
            core.Tags.of(i).add('Network', 'Public')
            include_resource_types = ["AWS::EC2::Subnet"]
            core.CfnOutput(
                self, f"PublicSubnet{index}",
                value=i.subnet_id,
                description="PublicSubnetId"
            )
            index += 1

        index = 1
        for i in vpc.isolated_subnets:
            core.Tags.of(i).add('SubnetTier', 'Isolated')
            core.Tags.of(i).add('Network', 'Isolated')
            include_resource_types = ["AWS::EC2::Subnet"]
            core.CfnOutput(
                self, f"IsolatedSubnet{index}",
                value=i.subnet_id,
                description="IsolatedSubnetId"
            )
            index += 1
        self.output_props = props.copy()

        core.CfnOutput(
            self, f"VpcId",
            value=vpc.vpc_id,
            description="VpcId"
        )
    # pass objects to another stack
    @property
    def outputs(self):
        return self.output_props
