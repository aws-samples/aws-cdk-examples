from aws_cdk import (
    aws_s3 as aws_s3,
    aws_ssm,
    aws_iam,
    aws_ec2,
    core,
)
import itertools


class Base(core.Stack):
    def __init__(self, app: core.App, id: str, props, **kwargs) -> None:
        super().__init__(app, id, **kwargs)
        public_private_selection = [aws_ec2.SubnetSelection(subnet_type=aws_ec2.SubnetType.PUBLIC),
                                    aws_ec2.SubnetSelection(subnet_type=aws_ec2.SubnetType.PRIVATE)]
        all_subnet_types = [aws_ec2.SubnetSelection(subnet_type=aws_ec2.SubnetType.PUBLIC),
                            aws_ec2.SubnetSelection(subnet_type=aws_ec2.SubnetType.PRIVATE),
                            aws_ec2.SubnetSelection(subnet_type=aws_ec2.SubnetType.ISOLATED)]
        vpc = aws_ec2.Vpc(
            self, 'vpc',
            cidr='10.0.0.0/16',
            max_azs=4,
            enable_dns_hostnames=True,
            enable_dns_support=True,
            nat_gateways=4,  # default is 1 per az, this enables high availability
            subnet_configuration=[
                aws_ec2.SubnetConfiguration(name='PUBLIC,', subnet_type=aws_ec2.SubnetType.PUBLIC, cidr_mask=23),
                aws_ec2.SubnetConfiguration(name='PRIVATE,', subnet_type=aws_ec2.SubnetType.PRIVATE, cidr_mask=23),
                aws_ec2.SubnetConfiguration(name='ISOLATED,', subnet_type=aws_ec2.SubnetType.ISOLATED, cidr_mask=23),
                aws_ec2.SubnetConfiguration(name='ISOLATED2,', subnet_type=aws_ec2.SubnetType.ISOLATED, cidr_mask=23)

            ],
            gateway_endpoints={
                'S3': {'service': aws_ec2.GatewayVpcEndpointAwsService.S3,
                       'subnets': all_subnet_types},
                'DynamoDB': {'service': aws_ec2.GatewayVpcEndpointAwsService.DYNAMODB,
                             'subnets': public_private_selection}
            }

        )

        vpc_subnets = vpc.public_subnets + vpc.private_subnets + vpc.isolated_subnets
        # for session manager
        ssm_private_link_endpoint = aws_ec2.InterfaceVpcEndpoint(
            self, 'SSMMEndpoint',
            vpc=vpc,
            subnets=aws_ec2.SubnetSelection(subnet_type=aws_ec2.SubnetType.ISOLATED),
            service=aws_ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES,
            private_dns_enabled=True
        )

        excluded_resources = ["AWS::EC2::EIP"]
        # this will tag most of the resources in the vpc such as vpc, route tables, igw
        core.Tag.add(vpc, 'app_namespace', 'cdk-examples', exclude_resource_types=excluded_resources)
        core.Tag.add(vpc, 'namespace', 'cdk-examples', exclude_resource_types=excluded_resources)

        # flatten list of lists
        vpc_subnets_list = [vpc.public_subnets, vpc.private_subnets, vpc.isolated_subnets]
        # flatten the list
        vpc_subnets_list = list(itertools.chain.from_iterable(vpc_subnets_list))

        # tag the subnets with a namespace
        for i in vpc_subnets_list:
            core.Tag.add(i, 'namespace', props['namespace'])

        # tag the subnets with their type
        subnet_resource_type = ["AWS::EC2::Subnet"]
        for i in vpc.isolated_subnets:
            core.Tag.add(i, 'SubnetTier', 'Protected')

        for i in vpc.private_subnets:
            core.Tag.add(i, 'SubnetTier', 'Private')

        # avoid errors with EIP resource tagging
        for i in vpc.public_subnets:
            core.Tag.add(i, 'SubnetTier', 'Public', include_resource_types=subnet_resource_type)

        # separate tags for same cdk subnet type, this is optional, but a good example of working with 2 different subnets that CDK sees as the same, (isolate) but we are separating them for different purposes
        protected_common = vpc.select_subnets(subnets=vpc.isolated_subnets[0:4])
        protected_management = vpc.select_subnets(subnets=vpc.isolated_subnets[4:8])
        for i in protected_common.subnets:
            core.Tag.add(i, 'SubnetType', 'ProtectedCommon')

        for i in protected_management.subnets:
            core.Tag.add(i, 'SubnetType', 'ProtectedMgmt')

        self.output_props = props.copy()

    # pass objects to another stack
    @property
    def outputs(self):
        return self.output_props
