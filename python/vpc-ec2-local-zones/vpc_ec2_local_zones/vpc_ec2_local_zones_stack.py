import re

from aws_cdk import (
    Stack,
    CfnOutput,
    aws_ec2 as ec2,
    aws_elasticloadbalancingv2 as elbv2,
    aws_autoscaling as autoscaling,
)
from constructs import Construct

# Local Zone to be used
LZ_NAME = "us-east-1-atl-1a"
# VPC CIDR that will be used to create a new VPC
VPC_CIDR = "172.31.100.0/24"
# Subnet size of the subnets in the Local Zone
SUBNET_SIZE = 26


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
            ip_addresses = ec2.IpAddresses.cidr(VPC_CIDR),
            subnet_configuration = [
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
        amzn_linux = ec2.MachineImage.latest_amazon_linux(generation=ec2.AmazonLinuxGeneration.AMAZON_LINUX_2)
        user_data = self.get_user_data("nat_instance")
        nat = ec2.Instance(self, "NATInstanceInLZ",
                 vpc=vpc,
                 security_group=self.create_nat_SG(vpc),
                 instance_type=ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
                 machine_image=amzn_linux,
                 user_data=ec2.UserData.custom(user_data),
                 vpc_subnets=ec2.SubnetSelection(availability_zones=[LZ_NAME], subnet_type=ec2.SubnetType.PUBLIC),
                 source_dest_check=False
                )
        return nat

    # method to add a default route in the private subnet pointing to the NAT instance
    def add_route_to_nat(self, vpc, nat_instance):
        # select the private subnet created before
        priv_subnet = ec2.SubnetFilter.availability_zones([LZ_NAME]).select_subnets(vpc.isolated_subnets)
        # add the default route pointing to the nat instance
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

    def create_ALB_in_lz(self, vpc, wp_as):
        alb = elbv2.ApplicationLoadBalancer(self,
        "ALB_in_LZ",
        vpc=vpc,
        internet_facing=True,
        vpc_subnets=ec2.SubnetSelection(availability_zones=[LZ_NAME],subnet_type=ec2.SubnetType.PUBLIC),
        )
        http_listener = alb.add_listener("ListenerHTTP", port=80)
        tg = http_listener.add_targets("AppFleet", port=8080,targets=[wp_as])
        # WP will reply to ALB health-checks with a 301 HTTP code. we need to asdjust tg configuration accordingly
        tg.configure_health_check(
            healthy_http_codes = "200,301"
        )
        # allow traffic from ALB on target instance
        wp_as.connections.allow_from(alb, ec2.Port.tcp(8080), "ALB access on target instance")
        return alb


    # method to create a new EC2 instance with MySQL installed through User Data script
    # see user_data/db_mysql txt file to see the User Data script
    def create_db_mysql(self, vpc):
        amzn_linux = ec2.MachineImage.latest_amazon_linux(generation=ec2.AmazonLinuxGeneration.AMAZON_LINUX_2)
        user_data = self.get_user_data("db_mysql")
        db = ec2.Instance(self, "DBInLZ",
                 vpc=vpc,
                 instance_type=ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
                 machine_image=amzn_linux,
                 user_data=ec2.UserData.custom(user_data),
                 vpc_subnets=ec2.SubnetSelection(availability_zones=[LZ_NAME],subnet_type=ec2.SubnetType.PRIVATE_ISOLATED),
                )
        return db

    # method to create a new AutoScaling group for managing WordPress instances.
    # see user_data/wp_webserver txt file to see the User Data script
    def create_wp_webserver(self, vpc, db):
        amzn_linux = ec2.MachineImage.latest_amazon_linux(generation=ec2.AmazonLinuxGeneration.AMAZON_LINUX_2)
        user_data = self.get_user_data("wp_webserver")
        # we need to modify the user data script to provide the dns name of the
        # mysql database installed in the private subnet.
        user_data = re.sub('dbhost', db.instance_private_dns_name, user_data)

        wp_as = autoscaling.AutoScalingGroup(self,
                "WordPressAS",
                vpc=vpc,
                instance_type=ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
                machine_image=amzn_linux,
                user_data=ec2.UserData.custom(user_data),
                vpc_subnets=ec2.SubnetSelection(availability_zones=[LZ_NAME],
                                subnet_type=ec2.SubnetType.PRIVATE_ISOLATED),
        )
        # allow connections from wp_instance to db
        db.connections.allow_from(wp_as, ec2.Port.tcp(3306), "WP access on db port")
        return wp_as

    def get_user_data(self, filename):
        with open('./user_data/' + filename) as f:
            user_data = f.read()
        return user_data

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # create new VPC in the Local Zone
        vpc = self.create_VPC()

        # create NAT instance
        nat_instance = self.create_nat_instance(vpc)
        self.add_route_to_nat(vpc, nat_instance)

        # create db mysql
        db = self.create_db_mysql(vpc)
        # create an AutoScaling groups to manage web server with WordPress
        wp_as = self.create_wp_webserver(vpc, db)
        # create ALB
        alb = self.create_ALB_in_lz(vpc, wp_as)
        CfnOutput(self, "ALB DNS name: ", value=alb.load_balancer_dns_name)
        CfnOutput(self, "URL: ", value='http://'+alb.load_balancer_dns_name)
