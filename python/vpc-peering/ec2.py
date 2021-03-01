from aws_cdk import (
    aws_ec2 as ec2,
    aws_iam as iam,
    core,
)

class Ec2(core.Stack):
    def __init__(self, app: core.App, id: str, props, vpc: ec2.IVpc, ingress_cidr: str, **kwargs) -> None:
        super().__init__(app, id, **kwargs)

        role = iam.Role(self, "ec2_role", assumed_by = iam.ServicePrincipal("ec2.amazonaws.com"))
        role.add_managed_policy(iam.ManagedPolicy.from_aws_managed_policy_name("AmazonSSMManagedInstanceCore"))

        sg = ec2.SecurityGroup(
            self, f"{props['namespace']}-sg",
            vpc=vpc,
            allow_all_outbound=True,
            description="allow ssh for vpc endpoint"
        )
        sg.add_ingress_rule(ec2.Peer.ipv4(ingress_cidr), ec2.Port.all_traffic(), "allow icmp access from peered vpc")

        instance = ec2.Instance(self, "instance",
            vpc = vpc,
            role = role,
            security_group = sg,
            instance_type=ec2.InstanceType("t3.nano"),
            machine_image = ec2.MachineImage.latest_amazon_linux(
                generation = ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
                edition = ec2.AmazonLinuxEdition.STANDARD,
                virtualization = ec2.AmazonLinuxVirt.HVM,
                storage = ec2.AmazonLinuxStorage.GENERAL_PURPOSE
            )
        )
        instance.user_data.add_commands(f"yum install jq -y")

        self.output_props = props.copy()
        self.output_props['ec2'] = instance

    # pass objects to another stack
    @property
    def outputs(self):
        return self.output_props
