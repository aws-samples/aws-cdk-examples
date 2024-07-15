import aws_cdk.aws_ec2 as ec2
import aws_cdk.aws_s3 as s3
from aws_cdk import Stack, Tags, App
from constructs import Construct
import aws_cdk as core
class VPCStack(Stack):

   def __init__(self, scope: Construct, id: str, **kwargs, ) -> None:
        super().__init__(scope, id, **kwargs )
        environment_name ="appmesh-env"
        # The following code creates the core VPC infrastructure with two public subnets and two private subnets, as well as route tables 
        # that route private subnets to the internet using NAT gateways
        vpc = ec2.CfnVPC(self, "appmesh-vpc",
            cidr_block="192.168.0.0/16",
            enable_dns_support=True,
            enable_dns_hostnames=True,
            tags=[{
                "key": "Name",
                "value": "appmesh-vpc"
            }]
        )
        public_subnet_1 = ec2.CfnSubnet(self, "PublicSubnet1",
            cidr_block="192.168.1.0/24",
            vpc_id=vpc.ref,
            availability_zone=f"{core.Aws.REGION}a",
            map_public_ip_on_launch=True,
            tags=[{
                "key": "Name",
                "value": "PublicSubnet1"
            }]
        )
        public_subnet_2 = ec2.CfnSubnet(self, "PublicSubnet2",
            cidr_block="192.168.2.0/24",
            vpc_id=vpc.ref,
            availability_zone=f"{core.Aws.REGION}b",
            map_public_ip_on_launch=True,
            tags=[{
                "key": "Name",
                "value": "PublicSubnet2"
            }]
        )
        private_subnet_1 = ec2.CfnSubnet(self, "PrivateSubnet1",
            cidr_block="192.168.3.0/24",
            vpc_id=vpc.ref,
            availability_zone=f"{core.Aws.REGION}a",
            tags=[{
                "key": "Name",
                "value": "PrivateSubnet1"
            }]
        )

        private_subnet_2 = ec2.CfnSubnet(self, "PrivateSubnet2",
            cidr_block="192.168.4.0/24",
            vpc_id=vpc.ref,
             availability_zone=f"{core.Aws.REGION}b",
            tags=[{
                "key": "Name",
                "value": "PrivateSubnet2"
            }]
        )
        internet_gateway = ec2.CfnInternetGateway(self, "InternetGateway",
            tags=[{
                "key": "Name",
                "value": "InternetGateway"
            }]
        )
        gateway_attachment = ec2.CfnVPCGatewayAttachment(self, "IGWAttachment",
            vpc_id=vpc.ref,
            internet_gateway_id=internet_gateway.ref
        )


        NatGateway1EIP = ec2.CfnEIP(self, "NatGateway1EIP", domain="vpc")
        NatGateway2EIP = ec2.CfnEIP(self, "NatGateway2EIP", domain="vpc")
        

        cfn_nat_gateway1 = ec2.CfnNatGateway(self, "MyCfnNatGateway1",
        allocation_id=NatGateway1EIP.attr_allocation_id,
        subnet_id=public_subnet_1.attr_subnet_id)
        
        cfn_nat_gateway2 = ec2.CfnNatGateway(self, "MyCfnNatGateway2",
        allocation_id=NatGateway2EIP.attr_allocation_id,
        subnet_id=public_subnet_1.attr_subnet_id)
        NatGateway1EIP.node.add_dependency(gateway_attachment)
        NatGateway2EIP.node.add_dependency(gateway_attachment)
        cfn_nat_gateway1.node.add_dependency(NatGateway1EIP)
        cfn_nat_gateway2.node.add_dependency(NatGateway2EIP)

        public_route_table = ec2.CfnRouteTable(self, "PublicRouteTable",
                                               vpc_id=vpc.attr_vpc_id,
                                               tags=[{
                                                   "key": "Name",
                                                   "value": f"{environment_name} Public Routes"
                                               }])
        ec2.CfnRoute(self, "DefaultPublicRoute", 
            route_table_id=public_route_table.attr_route_table_id,
            destination_cidr_block="0.0.0.0/0",
            gateway_id=gateway_attachment.internet_gateway_id
            
        )

        ec2.CfnSubnetRouteTableAssociation(self, f"PublicSubnetRouteTableAssociation1",
                                               route_table_id=public_route_table.attr_route_table_id,
                                               subnet_id=public_subnet_1.attr_subnet_id)
        ec2.CfnSubnetRouteTableAssociation(self, f"PublicSubnetRouteTableAssociation2",
                                               route_table_id=public_route_table.attr_route_table_id,
                                               subnet_id=public_subnet_2.attr_subnet_id)
        privateRouteTable = ec2.CfnRouteTable(self, "PrivateRouteTable1",
                          vpc_id=vpc.attr_vpc_id,
                          tags=[{
                              "key": "Name",
                              "value": f"{environment_name} Private Routes (AZ1)"
                          }])
        
        ec2.CfnRoute(self, "DefaultPrivateRoute1",
                     route_table_id=privateRouteTable.ref,
                     destination_cidr_block="0.0.0.0/0",
                     nat_gateway_id=cfn_nat_gateway1.ref)
        
        ec2.CfnSubnetRouteTableAssociation(self, "PrivateSubnetRouteTableAssociation",
                                           subnet_id=private_subnet_1.attr_subnet_id,
                                           route_table_id=privateRouteTable.ref)
        
        privateRouteTable2 = ec2.CfnRouteTable(self, "PrivateRouteTable2",
                          vpc_id=vpc.attr_vpc_id,
                          tags=[{
                              "key": "Name",
                              "value": f"{environment_name} Private Routes (AZ2)"
                          }])
        
        ec2.CfnRoute(self, "DefaultPrivateRoute2",
                     route_table_id=privateRouteTable2.ref,
                     destination_cidr_block="0.0.0.0/0",
                     nat_gateway_id=cfn_nat_gateway2.ref)
        
        ec2.CfnSubnetRouteTableAssociation(self, "PrivateSubnet2RouteTableAssociation",
                                           subnet_id=private_subnet_2.attr_subnet_id,
                                           route_table_id=privateRouteTable2.ref)
        core.CfnOutput(
            self, "VPCID",
            value=vpc.attr_vpc_id,
            export_name=f"{environment_name}:VPCID"
        )
        core.CfnOutput(
            self, "Public Subnet 1",
            value=public_subnet_1.attr_subnet_id,
            export_name=f"{environment_name}:PublicSubnet1"
        )
        core.CfnOutput(
            self, "Public Subnet 2",
            value=public_subnet_2.attr_subnet_id,
            export_name=f"{environment_name}:PublicSubnet2"
        )
        core.CfnOutput(
            self, "Private Subnet 1",
            value=private_subnet_1.attr_subnet_id,
            export_name=f"{environment_name}:PrivateSubnet1"
        )
        core.CfnOutput(
            self, "Private Subnet 2",
            value=private_subnet_2.attr_subnet_id,
            export_name=f"{environment_name}:PrivateSubnet2"
        )
        core.CfnOutput(self, "VpcCidr", 
            value=vpc.attr_cidr_block,
            export_name=f"{environment_name}:VpcCidr"
        )
        
        
      


        
        
        
    
        