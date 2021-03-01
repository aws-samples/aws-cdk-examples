from aws_cdk import (
    aws_ec2 as ec2,
    core,
)

class Vpc(core.Stack):
    def __init__(self, app: core.Construct, id: str, props, cidr: str, **kwargs) -> None:
        super().__init__(app, id, **kwargs)

        self.output_props=props.copy()
        self.output_props['vpc']=self.vpc(cidr)

    def vpc(self, cidr: str):
        subnets = [
            ec2.SubnetConfiguration(
                cidr_mask=24,
                name="Ingress",
                subnet_type=ec2.SubnetType.PUBLIC,
            ),
            ec2.SubnetConfiguration(
                cidr_mask=24,
                name="Application",
                subnet_type=ec2.SubnetType.PRIVATE,
            ),
            ec2.SubnetConfiguration(
                cidr_mask=28,
                name="Database",
                subnet_type=ec2.SubnetType.ISOLATED,
                reserved=True
            )
        ]

        # vpc
        vpc = ec2.Vpc(self, "vpc",
            max_azs=1,
            cidr=cidr,
            subnet_configuration=subnets,
        )
        self.vpc=vpc
        self.endpoints()

        return vpc

    def endpoints(self):
        # security group for vpc endpoint
        sg = ec2.SecurityGroup(
            self, "vpce-sg",
            vpc=self.vpc,
            allow_all_outbound=True,
            description="allow tls for vpc endpoint"
        )

        # vpc endpoints
        self.vpc.add_gateway_endpoint(
            "s3-vpce",
            service=ec2.GatewayVpcEndpointAwsService.S3
        )

        self.vpc.add_interface_endpoint(
            "ecr.api-vpce",
            service=ec2.InterfaceVpcEndpointAwsService.ECR,
            private_dns_enabled=True,
            security_groups=[sg]
        )

        self.vpc.add_interface_endpoint(
            "ecr.dkr-vpce",
            service=ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
            private_dns_enabled=True,
            security_groups=[sg]
        )

        self.vpc.add_interface_endpoint(
            "sagemaker.notebook-vpce",
            service=ec2.InterfaceVpcEndpointAwsService.SAGEMAKER_NOTEBOOK,
            private_dns_enabled=True,
            security_groups=[sg]
        )

        self.vpc.add_interface_endpoint(
            "sagemaker.api-vpce",
            service=ec2.InterfaceVpcEndpointAwsService.SAGEMAKER_API,
            private_dns_enabled=True,
            security_groups=[sg]
        )

        self.vpc.add_interface_endpoint(
            "sagemaker.runtime-vpce",
            service=ec2.InterfaceVpcEndpointAwsService.SAGEMAKER_RUNTIME,
            private_dns_enabled=True,
            security_groups=[sg]
        )

        self.vpc.add_interface_endpoint(
            "efs-vpce",
            service=ec2.InterfaceVpcEndpointAwsService.ELASTIC_FILESYSTEM,
            private_dns_enabled=True,
            security_groups=[sg]
        )

        self.vpc.add_interface_endpoint(
            "sts-vpce",
            service=ec2.InterfaceVpcEndpointAwsService.STS,
            private_dns_enabled=True,
            security_groups=[sg]
        )

        self.vpc.add_interface_endpoint(
            "ssm-vpce",
            service=ec2.InterfaceVpcEndpointAwsService.SSM,
            private_dns_enabled=True,
            security_groups=[sg]
        )

        self.vpc.add_interface_endpoint(
            "ssm-msg-vpce",
            service=ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES,
            private_dns_enabled=True,
            security_groups=[sg]
        )

        self.vpc.add_interface_endpoint(
            "ec2-vpce",
            service=ec2.InterfaceVpcEndpointAwsService.EC2,
            private_dns_enabled=True,
            security_groups=[sg]
        )

        self.vpc.add_interface_endpoint(
            "ec2-msg-vpce",
            service=ec2.InterfaceVpcEndpointAwsService.EC2_MESSAGES,
            private_dns_enabled=True,
            security_groups=[sg]
        )

    # pass objects to another stack
    @property
    def outputs(self):
        return self.output_props

class IsolatedVpc(Vpc):
    def __init__(self, app: core.Construct, id: str, props, cidr: str, **kwargs) -> None:
        super().__init__(app, id, props, cidr, **kwargs)

    def vpc(self, cidr: str):
        subnets = [
            ec2.SubnetConfiguration(
                cidr_mask=24,
                name="isolated",
                subnet_type=ec2.SubnetType.ISOLATED,
            )
        ]

        # vpc
        vpc = ec2.Vpc(self, "vpc",
            max_azs=1,
            cidr=cidr,
            subnet_configuration=subnets,
        )
        self.vpc=vpc
        self.endpoints()

        return vpc

class PublicVpc(Vpc):
    def __init__(self, app: core.Construct, id: str, props, cidr: str, **kwargs) -> None:
        super().__init__(app, id, props, cidr, **kwargs)

    def vpc(self, cidr: str):
        subnets = [
            ec2.SubnetConfiguration(
                cidr_mask=26,
                name="public",
                subnet_type=ec2.SubnetType.PUBLIC
            )
        ]

        # vpc
        vpc = ec2.Vpc(self, "vpc",
            max_azs=1,
            cidr=cidr,
            subnet_configuration=subnets,
        )
        self.vpc=vpc

        return vpc
