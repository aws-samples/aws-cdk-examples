from aws_cdk import core
import aws_cdk.aws_ec2 as ec2

vpc_id = "vpc-111111"  # Import an Exist VPC
ec2_type = "m5.xlarge"
key_name = "id_rsa"
linux_ami = ec2.GenericLinuxImage({
    "cn-northwest-1": "ami-0f62e91915e16cfc2",
    "eu-west-1": "ami-1111111"
})
with open("./user_data/user_data.sh") as f:
    user_data = f.read()


class CdkVpcEc2Stack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, **kwargs) -> None:
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
        # ec2.Instance has no property of BlockDeviceMappings. Add via lower layer:
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
        ])
        host.connections.allow_from_any_ipv4(
            ec2.Port.tcp(22), "Allow ssh from internet")
        host.connections.allow_from_any_ipv4(
            ec2.Port.tcp(80), "Allow ssh from internet")

        core.CfnOutput(self, "Output",
                       value=host.instance_public_ip)
