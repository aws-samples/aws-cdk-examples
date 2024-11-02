from aws_cdk import (
    Stack,
    aws_ec2 as ec2,
)
from constructs import Construct
from ecs.ecs_stack import EcsStack
from ecr.ecr_stack import EcrStack
class CdkExamplesServiceConnectStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        # Creating a shared VPC with public subnets and private subnets with NAT Gateways
        vpc = ec2.Vpc(self, "ServiceConnectVPC",
                    ip_addresses=ec2.IpAddresses.cidr("10.0.0.0/16"),
                    create_internet_gateway=True,
                    max_azs=2,
                    nat_gateways=2,
                    enable_dns_hostnames=True,
                    enable_dns_support=True,
                    vpc_name="App-Mesh-VPC",
                    subnet_configuration=[
                        ec2.SubnetConfiguration(
                            subnet_type=ec2.SubnetType.PUBLIC,
                            name="Public",
                            cidr_mask=24
                        ),
                        ec2.SubnetConfiguration(
                            subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS,
                            name="Private",
                            cidr_mask=24
                        )
                    ]
                    )
        AWSRegion=Stack.of(self).region
        AWSStackId=Stack.of(self).stack_id
        ecr_stack = EcrStack(self, "EcrStack")
        ecs_stack = EcsStack(self, "EcsStack", vpc=vpc, frontend_repository=ecr_stack.frontend_docker_asset, backend_data_repository=ecr_stack.backend_data_docker_asset)
