import aws_cdk.aws_ec2 as ec2
import aws_cdk.aws_s3 as s3
import aws_cdk.aws_ssm as ssm
from aws_cdk import Stack, Tags, App
from constructs import Construct
import aws_cdk as core
class VPCStack(Stack):

   def __init__(self, scope: Construct, id: str, **kwargs, ) -> None:
        super().__init__(scope, id, **kwargs )
        environment_name ="appmesh-env"
        # The following code creates the core VPC infrastructure with two public subnets and two private subnets, as well as route tables 
        # that route private subnets to the internet using NAT gateways
        
        vpc = ec2.Vpc(self, "AppMeshVPC",
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
        vpc_id_ssm_store = ssm.StringParameter(self, "vpcid", parameter_name="vpc_id", string_value=vpc.vpc_id)
        core.CfnOutput(

            self, "VPCID",
            value=vpc.vpc_id,
            export_name=f"{environment_name}:VPCID"
        )
        core.CfnOutput(
            self, "Public Subnet 1",
            value=vpc.public_subnets[0].subnet_id,
            export_name=f"{environment_name}:PublicSubnet1"
        )
        core.CfnOutput(
            self, "Public Subnet 2",
            value=vpc.public_subnets[1].subnet_id,
            export_name=f"{environment_name}:PublicSubnet2"
        )
        core.CfnOutput(
            self, "Private Subnet 1",
            value=vpc.private_subnets[0].subnet_id,
            export_name=f"{environment_name}:PrivateSubnet1"
        )
        core.CfnOutput(
            self, "Private Subnet 2",
            value=vpc.private_subnets[1].subnet_id,
            export_name=f"{environment_name}:PrivateSubnet2"
        )
        core.CfnOutput(self, "VpcCidr", 
            value=vpc.vpc_cidr_block,
            export_name=f"{environment_name}:VpcCidr"
        )