from aws_cdk import (
    aws_ec2 as ec2,
    aws_iam as iam,
    core,
)

class Vpc(core.Stack):
    def __init__(self, app: core.App, id: str, props, **kwargs) -> None:
        super().__init__(app, id, **kwargs)

        vpc = ec2.Vpc(self, "vpc", max_azs = 2)

        core.CfnOutput(
            self, "VPCID",
            description = "VPC ID",
            value = vpc.vpc_id
        )

        self.output_props = props.copy()
        self.output_props['vpc']= vpc

    # pass objects to another stack
    @property
    def outputs(self):
        return self.output_props

class Ec2(core.Stack):
    def __init__(self, app: core.App, id: str, props, **kwargs) -> None:
        super().__init__(app, id, **kwargs)

        role = iam.Role(self, "ec2_role", assumed_by = iam.ServicePrincipal("ec2.amazonaws.com"))
        role.add_managed_policy(iam.ManagedPolicy.from_aws_managed_policy_name("AWSCloudMapFullAccess"))
        role.add_managed_policy(iam.ManagedPolicy.from_aws_managed_policy_name("service-role/AmazonEC2RoleforSSM"))

        instance = ec2.Instance(self, "ec2_instance",
            vpc = props['vpc'],
            role = role,
            instance_type=ec2.InstanceType("t3.nano"),
            machine_image = ec2.MachineImage.latest_amazon_linux(
                generation = ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
                edition = ec2.AmazonLinuxEdition.STANDARD,
                virtualization = ec2.AmazonLinuxVirt.HVM,
                storage = ec2.AmazonLinuxStorage.GENERAL_PURPOSE
            )
        )

        with open('register-ip-instance.sh','r') as file:
            userdata = file.read()
        instance.user_data.add_commands(userdata)
        file.close()

        core.CfnOutput(
            self, "INSTANCEID",
            description = "Instance ID",
            value = instance.instance_id
        )

        self.output_props = props.copy()
        self.output_props['ec2'] = instance

    # pass objects to another stack
    @property
    def outputs(self):
        return self.output_props
