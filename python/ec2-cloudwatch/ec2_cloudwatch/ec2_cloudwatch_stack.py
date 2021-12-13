from aws_cdk import CfnOutput, Duration, Stack
from aws_cdk import aws_ec2, aws_cloudwatch
from aws_cdk import aws_backup as backup
from aws_cdk.aws_events import Rule, Schedule
from aws_cdk.aws_events_targets import AwsApi
from constructs import Construct


class Ec2CloudwatchStack(Stack):

    def __init__(self, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # The code from zhxinyua to create VPC, s3_endpoint, bastion, EC2, EBS, Cloudwatch event rule stop EC2, Backup for EC2

        # create a new VPC
        vpc_new = aws_ec2.Vpc(self, "VpcFromCDK", cidr="10.0.0.0/16")
        vpc_new.add_gateway_endpoint("S3Endpoint",
            service=aws_ec2.GatewayVpcEndpointAwsService.S3,
            # Add only to ISOLATED subnets
            subnets=[aws_ec2.SubnetSelection(subnet_type=aws_ec2.SubnetType.PUBLIC)
            ]
        )

        # only allow a specific rang of IP to conncet bastion
        # BastionHostLinux support two way to connect, one is SSM, second is EC2 Instance Connect
        # EC2 Instance Connect are not supportd in CN
        host_bastion = aws_ec2.BastionHostLinux(self, "BastionHost",
                                                vpc=vpc_new,
                                                subnet_selection=aws_ec2.SubnetSelection(subnet_type=aws_ec2.SubnetType.PUBLIC)
                                                )

        # write your own IP rang to access this bastion instead of 1.2.3.4/32
        host_bastion.allow_ssh_access_from(aws_ec2.Peer.ipv4("1.2.3.4/32"))

        # use amazon linux as OS
        amzn_linux = aws_ec2.MachineImage.latest_amazon_linux(generation=aws_ec2.AmazonLinuxGeneration.AMAZON_LINUX,
                                                              edition=aws_ec2.AmazonLinuxEdition.STANDARD,
                                                              virtualization=aws_ec2.AmazonLinuxVirt.HVM,
                                                              storage=aws_ec2.AmazonLinuxStorage.GENERAL_PURPOSE)

        # secure group
        my_security_group = aws_ec2.SecurityGroup(self, "SecurityGroup",
                                                  vpc=vpc_new,
                                                  description="SecurityGroup from CDK",
                                                  security_group_name="CDK SecurityGroup",
                                                  allow_all_outbound=True,
                                                  )

        my_security_group.add_ingress_rule(aws_ec2.Peer.ipv4('10.0.0.0/16'), aws_ec2.Port.tcp(22), "allow ssh access from the VPC")

        # set up an web instance in public subnet
        work_server = aws_ec2.Instance(self, "WebInstance",
                                       instance_type=aws_ec2.InstanceType("Write a EC2 instance type"),
                                       machine_image=amzn_linux,
                                       vpc=vpc_new,
                                       vpc_subnets=aws_ec2.SubnetSelection(subnet_type=aws_ec2.SubnetType.PUBLIC),
                                       security_group=my_security_group,
                                       key_name="Your SSH key pair name")

        # allow web connect
        work_server.connections.allow_from_any_ipv4(aws_ec2.Port.tcp(80), "allow http from world")
        work_server.connections.allow_from_any_ipv4(aws_ec2.Port.tcp(443), "allow https from world")

        # set a second ebs to web instance
        work_server.instance.add_property_override("BlockDeviceMappings", [{
            "DeviceName": "/dev/sdb",
            "Ebs": {"VolumeSize": "30",
                    "VolumeType": "gp2",
                    "DeleteOnTermination": "true"}
        }])

        # Cloudwatch event rule to stop instances every day in 15:00 UTC
        # they only use javascript SDK to call AWS API
        # https://docs.aws.amazon.com/cdk/api/latest/python/aws_cdk.aws_events_targets/AwsApi.html
        stop_EC2 = AwsApi(service="EC2",
                          action="stopInstances",
                          parameters={"InstanceIds": [work_server.instance_id, host_bastion.instance_id]})

        Rule(self, "ScheduleRule", schedule=Schedule.cron(minute="0", hour="15"), targets=[stop_EC2])

        # AWS backup part
        # create a BackupVault
        vault = backup.BackupVault(self, "BackupVault", backup_vault_name="CDK_Backup_Vault")

        # create a BackupPlan
        plan = backup.BackupPlan(self, "AWS-Backup-Plan", backup_plan_name="CDK_Backup")

        # add buackup resources with two way for two resources
        plan.add_selection("Selection", resources=[
            backup.BackupResource.from_ec2_instance(work_server),
            backup.BackupResource.from_tag("Name", "BastionHost")
        ])

        # details with backup rules
        plan.add_rule(backup.BackupPlanRule(backup_vault=vault,
                                            rule_name="CDK_Backup_Rule",
                                            schedule_expression=Schedule.cron(minute="0", hour="16", day="1", month="1-12"),
                                            delete_after=Duration.days(130),
                                            move_to_cold_storage_after=Duration.days(10)))

        # output information after deploy
        output = CfnOutput(self, "BastionHost_information",
                                value=host_bastion.instance_public_ip,
                                description="BastionHost's Public IP")
        output = CfnOutput(self, "WebHost_information",
                                value=work_server.instance_public_ip,
                                description="Web server's Public IP")
