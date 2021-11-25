from aws_cdk import CfnOutput, Stack
import aws_cdk.aws_ec2 as ec2
from constructs import Construct

vpc_id = "MY-VPC-ID"  # Import an Exist VPC
ec2_type = "t2.micro"
key_name = "id_rsa"
linux_ami = ec2.GenericLinuxImage({
    "cn-northwest-1": "AMI-ID-IN-cn-northwest-1-REGION",  # Refer to an Exist AMI
    "eu-west-1": "AMI-ID-IN-eu-west-1-REGION"
})
with open("./user_data/user_data.sh") as f:
    user_data = f.read()


class CdkVpcEc2Stack(Stack):

    def __init__(self, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # The code that defines your stack goes here
        vpc = ec2.Vpc.from_lookup(self, "VPC", vpc_id=vpc_id)

        host = ec2.Instance(self, "myEC2",
                            instance_type=ec2.InstanceType(
                                instance_type_identifier=ec2_type),
                            instance_name="mySingleHost",
                            machine_image=linux_ami,
                            vpc=vpc,
                            key_name=key_name,
                            vpc_subnets=ec2.SubnetSelection(
                                subnet_type=ec2.SubnetType.PUBLIC),
                            user_data=ec2.UserData.custom(user_data)
                            )
        # ec2.Instance has no property of BlockDeviceMappings, add via lower layer cdk api:
        host.instance.add_property_override("BlockDeviceMappings", [{
            "DeviceName": "/dev/xvda",
            "Ebs": {
                "VolumeSize": "10",
                "VolumeType": "io1",
                "Iops": "150",
                "DeleteOnTermination": "true"
            }
        }, {
            "DeviceName": "/dev/sdb",
            "Ebs": {"VolumeSize": "30"}
        }
        ])  # by default VolumeType is gp2, VolumeSize 8GB
        host.connections.allow_from_any_ipv4(
            ec2.Port.tcp(22), "Allow ssh from internet")
        host.connections.allow_from_any_ipv4(
            ec2.Port.tcp(80), "Allow http from internet")

        CfnOutput(self, "Output",
                       value=host.instance_public_ip)
