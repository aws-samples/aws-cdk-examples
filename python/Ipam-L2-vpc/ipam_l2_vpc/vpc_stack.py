import math
from constructs import Construct
from aws_cdk import (
   
    Fn,
    Stack,
    aws_ec2 as ec2,
    
)


class VpcStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

    # The code that defines your stack goes here

        max_azs = 2
        self.vpc = ec2.Vpc(self, 'VPC',
            max_azs = max_azs,
            enable_dns_hostnames = True,
            enable_dns_support = True, 
            # configuration will create 2 subnets in a 2 AZ.
            subnet_configuration=[
                ec2.SubnetConfiguration(
                    name = 'Public-Subnet',
                    subnet_type = ec2.SubnetType.PUBLIC,
                ),
                ec2.SubnetConfiguration(
                    name = 'Private-Subnet',
                    subnet_type = ec2.SubnetType.PRIVATE_WITH_NAT,
                )
            ],
            nat_gateways = 2,
            nat_gateway_subnets=ec2.SubnetSelection(subnet_group_name="Public-Subnet"),
      
        )

        #import the pool id
        Ipam_pool_id = Fn.import_value("Poolid")
        Ipv4NetmaskLength = 16
        Ipv4NetmaskLength = Ipv4NetmaskLength.numerator
        # Override vpc construct
        cfn_vpc: ec2.CfnVPC = self.vpc.node.default_child
        cfn_vpc.add_property_deletion_override("CidrBlock")
        cfn_vpc.add_property_override("Ipv4IpamPoolId", Ipam_pool_id)
        cfn_vpc.add_property_override("Ipv4NetmaskLength", Ipv4NetmaskLength)

        # make sure to have dynamically the max division of subnets from vpc cidr block (it's just a choice you could use your own division)
        # if N is a power of two simply return it
        N = max_azs*2
        if not (N & (N - 1)):
            size_max = str(32-(Ipv4NetmaskLength+int(math.log2(N))))
        else :
        # else set only the left bit of most significant bit
            size_max = str(32-(Ipv4NetmaskLength+int(math.log2(int("1" + (len(bin(N)) - 2) * "0", 2)))))

        # count=max_azs*2 the *2 because I create 2 subnets in each Availability zone
        cidrs_subnet = Fn.cidr(ip_block=cfn_vpc.attr_cidr_block,count=max_azs*2,size_mask= size_max)

        # cidrs_subnet is a list of subnets cidr we could allocate by overriding as much as we need 
        
        # i is the number of availability zone                                                                           
        for i in range(max_azs) :
            cidr_pub_subnet = Fn.select(i,cidrs_subnet)
            cfn_subnet: ec2.CfnSubnet = self.vpc.public_subnets[i].node.default_child
            cfn_subnet.add_property_deletion_override("CidrBlock")
            cfn_subnet.add_property_override("CidrBlock", cidr_pub_subnet)

            cidr_priv_subnet = Fn.select(i+max_azs,cidrs_subnet)
            cfn_subnet: ec2.CfnSubnet = self.vpc.private_subnets[i].node.default_child
            cfn_subnet.add_property_deletion_override("CidrBlock")
            cfn_subnet.add_property_override("CidrBlock", cidr_priv_subnet)  


        # Security group creation
        self.VpcSG = ec2.SecurityGroup(self,'VPC-sg',vpc=self.vpc,allow_all_outbound=True,security_group_name='VPC4sg')
        self.VpcSG.add_ingress_rule(peer=ec2.Peer.any_ipv4(),connection=ec2.Port.all_traffic())

    

        