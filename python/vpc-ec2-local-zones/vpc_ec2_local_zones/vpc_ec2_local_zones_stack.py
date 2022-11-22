from aws_cdk import (
    Stack,
    aws_ec2 as ec2,
    aws_autoscaling as autoscaling,
)
from constructs import Construct
import re

# Local Zone to be used
LZ_NAME="us-east-1-atl-1a"
# VPC CIDR that will be used to create a new VPC
VPC_CIDR="172.31.100.0/24"
# Subnet size of the subnets in the Local Zone
SUBNET_SIZE=26

class VpcEc2LocalZonesStack(Stack):

    # overwrite availability_zones method used by CDK to determine the 
    # Avaialability Zones or the Local Zone to be used by ec2.VPC construct
    @property
    def availability_zones(self):
       return [LZ_NAME]

    def create_VPC(self): 
        vpc = ec2.Vpc(
            self, 
            "Vpc",
            cidr=VPC_CIDR,
            subnet_configuration=[
                ec2.SubnetConfiguration(
                    name = 'Public-Subent',
                    subnet_type = ec2.SubnetType.PUBLIC,
                    cidr_mask = SUBNET_SIZE,
                ),
                ec2.SubnetConfiguration(
                    name = 'Private-Subent',
                    subnet_type = ec2.SubnetType.PRIVATE_ISOLATED,
                    cidr_mask = SUBNET_SIZE,
                ),
            ]       
        )
        return vpc

    # method to create a NAT Instance in the public subnet
    # see user_data/nat_instance txt file to see the User Data script 
    # used to configured the NAT rules
    def create_nat_instance(self, vpc):
        amzn_linux = ec2.MachineImage.latest_amazon_linux()
        user_data = self.get_user_data("nat_instance")
        nat = ec2.Instance(self, "NATInstanceInLZ",
                 vpc=vpc,
                 security_group=self.create_nat_SG(vpc),
                 instance_type=ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
                 machine_image=amzn_linux,
                 user_data=ec2.UserData.custom(user_data),
                 vpc_subnets=ec2.SubnetSelection(availability_zones=[LZ_NAME],subnet_type=ec2.SubnetType.PUBLIC),
                 source_dest_check=False
                )
        return nat

    # method to add a default route in the private subnet pointing to the NAT instance
    def add_route_to_nat(self, vpc, nat_instance):
        #select the private subnet created before
        priv_subnet = ec2.SubnetFilter.availability_zones([LZ_NAME]).select_subnets(vpc.isolated_subnets)
        #add the default route pointing to the nat instance
        priv_subnet[0].add_route("DefRouteToNAT",
            router_id=nat_instance.instance_id,
            router_type=ec2.RouterType.INSTANCE,
            destination_cidr_block="0.0.0.0/0",
            enables_internet_connectivity=True)

    # method to add the Security Group attached to the NAT instance
    def create_nat_SG(self, vpc):
        sg = ec2.SecurityGroup(
            self,
            id="NatInstanceSG",
            vpc=vpc,
            allow_all_outbound=False,
            description="Nat Instance Security Group"
        )
        sg.add_ingress_rule(
            peer=ec2.Peer.ipv4(VPC_CIDR),
            connection=ec2.Port.tcp(80),
            description="HTTP ingress",
        ) 
        sg.add_ingress_rule(
            peer=ec2.Peer.ipv4(VPC_CIDR),
            connection=ec2.Port.tcp(443),
            description="HTTPS ingress",
        ) 
        sg.add_egress_rule(
            peer=ec2.Peer.ipv4("0.0.0.0/0"),
            connection=ec2.Port.tcp(80),
            description="HTTP egress",
        )
        sg.add_egress_rule(
            peer=ec2.Peer.ipv4("0.0.0.0/0"),
            connection=ec2.Port.tcp(443),
            description="HTTPS egress",
        )   
        return sg

    # method to create a new EC2 instance with MySQL installed through User Data script
    # see user_data/db_mysql txt file to see the User Data script 
    def create_db_mysql(self, vpc):
        amzn_linux = ec2.MachineImage.latest_amazon_linux()
        user_data = self.get_user_data("db_mysql")
        db = ec2.Instance(self, "DBInLZ",
                 vpc=vpc,
                 security_group=self.create_db_SG(vpc),
                 instance_type=ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
                 machine_image=amzn_linux,
                 user_data=ec2.UserData.custom(user_data),
                 vpc_subnets=ec2.SubnetSelection(availability_zones=[LZ_NAME],subnet_type=ec2.SubnetType.PRIVATE_ISOLATED),
                )
        return db

    def create_db_SG(self, vpc):
        sg = ec2.SecurityGroup(
            self,
            id="DBSG",
            vpc=vpc,
            allow_all_outbound=True,
            description="DB Instance Security Group"
        )
        sg.add_ingress_rule(
            peer=ec2.Peer.ipv4(VPC_CIDR),
            connection=ec2.Port.tcp(3306),
            description="HTTP ingress",
        )   
        return sg

    # method to create a new EC2 instance with WorkPress installed through User Data script.
    # see user_data/wp_webserver txt file to see the User Data script 
    def create_wp_webserver(self, vpc, db_dns):
        amzn_linux = ec2.MachineImage.latest_amazon_linux()
        user_data = self.get_user_data("wp_webserver")
        # we need to modify the user data script to provide the dns name of the
        # mysql database installed in the private subnet. 
        user_data = re.sub('dbhost', db_dns, user_data)

        wp = ec2.Instance(self, "WPInLZ",
                 vpc=vpc,
                 security_group=self.create_wp_SG(vpc),
                 instance_type=ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
                 machine_image=amzn_linux,
                 user_data=ec2.UserData.custom(user_data),
                 vpc_subnets=ec2.SubnetSelection(availability_zones=[LZ_NAME],subnet_type=ec2.SubnetType.PUBLIC),
                )
        return wp

    def create_wp_SG(self, vpc):
        sg = ec2.SecurityGroup(
            self,
            id="WPSG",
            vpc=vpc,
            allow_all_outbound=True,
            description="WP Instance Security Group"
        )
        sg.add_ingress_rule(
            peer=ec2.Peer.ipv4("0.0.0.0/0"),
            connection=ec2.Port.tcp(8080),
            description="HTTP ingress",
        )   
        return sg

    def get_user_data(self, filename):
        with open('./user_data/' + filename) as f:
            user_data = f.read()
        return user_data

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        #create new VPC in the Local Zone
        vpc = self.create_VPC()

        #create NAT instance
        nat_instance = self.create_nat_instance(vpc)
        self.add_route_to_nat(vpc, nat_instance)

        #create db mysql
        db = self.create_db_mysql(vpc)
        # create a web server with WorkPress installed
        wp = self.create_wp_webserver(vpc, db.instance_private_dns_name)