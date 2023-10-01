import os.path

from constructs import Construct
from aws_cdk import (
    Stack,
    Fn,
    CfnOutput,
    CfnParameter
)
from aws_cdk import (
    aws_iam as iam,
    aws_ec2 as ec2,
    aws_sns as sns,
)
from aws_cdk import aws_servicecatalog_alpha as sc


class Ec2Product(sc.ProductStack):
    def __init__(self, scope: Construct, id: str):
        super().__init__(scope, id)

        # VPC
        vpc = ec2.Vpc(self, "VPC",
            nat_gateways=0,
            subnet_configuration=[ec2.SubnetConfiguration(name="public",subnet_type=ec2.SubnetType.PUBLIC,cidr_mask=24)],
        )

        # Instance Role and SSM Managed Policy
        role = iam.Role(self, "ec2Role", assumed_by=iam.ServicePrincipal("ec2.amazonaws.com"))

        role.add_managed_policy(iam.ManagedPolicy.from_aws_managed_policy_name("AmazonSSMManagedInstanceCore"))

        # AMI
        amzn_linux = ec2.MachineImage.latest_amazon_linux(
            generation=ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
            cpu_type=ec2.AmazonLinuxCpuType.ARM_64,
        )

        # EC2 Instance Type parameter
        ec2_instance_type = CfnParameter(self, "InstanceType",
            type="String",
            description="The instance type of an EC2 instance.",
        )

        # Instance
        instance = ec2.Instance(self, "Instance",
            instance_type=ec2.InstanceType(ec2_instance_type.value_as_string),
            machine_image=amzn_linux,
            allow_all_outbound=True,
            vpc=vpc,
            role=role,
        )
        instance.connections.allow_from_any_ipv4(ec2.Port.tcp(22), "Allow SSH Access")

        # Create outputs for connecting
        CfnOutput(self, "IP Address", value=instance.instance_public_ip)
        CfnOutput(self, "Download Key Command", value="aws secretsmanager get-secret-value --secret-id ec2-ssh-key/cdk-keypair/private --query SecretString --output text > cdk-key.pem && chmod 400 cdk-key.pem")
        CfnOutput(self, "ssh command", value="ssh -i cdk-key.pem -o IdentitiesOnly=yes ec2-user@" + instance.instance_public_ip)

class Ec2CdkStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Create a portfolio
        portfolio = sc.Portfolio(self, "DevToolsPortfolio", 
            display_name="DevTools",
            provider_name="IT",
        )

        # Create an EC2 product from a Product Stack
        product = sc.CloudFormationProduct(self, "VpcEC2SampleStack", 
            product_name="Ec2CdkStack",
            owner="IT",
            product_versions=[
                sc.CloudFormationProductVersion(
                    cloud_formation_template=sc.CloudFormationTemplate.from_product_stack(Ec2Product(self, "EC2Product")),
                    product_version_name="FromProductStack",
                    description="A VPC containing an EC2 Instance",
                ),
                sc.CloudFormationProductVersion(
                    cloud_formation_template=sc.CloudFormationTemplate.from_asset(path="assets/ec2_vpc.json"),
                    product_version_name="FromAsset",
                    description="A VPC containing an EC2 Instance",
                ),
            ],
        )

        # Add a launch template constraint
        portfolio.constrain_cloud_formation_parameters(product,
            rule=sc.TemplateRule(
                rule_name="EC2InstanceTypes",
                assertions=[sc.TemplateRuleAssertion(
                    assert_=Fn.condition_contains(["t4g.micro", "t4g.small"], Fn.ref("InstanceType")),
                    description="For test environment, valid instance types are t4g.micro or t4g.small",
                )],
            ),
        )

        # Associate product to the portfolio
        portfolio.add_product(product)

        # Create SNS topics to listen to product events
        stack_events_topic = sns.Topic(self, "StackEventsTopic")
        # Add launch notification constraint
        portfolio.notify_on_stack_events(product, stack_events_topic)

        # Grant access to an end user
        dev_role = iam.Role(self, "SCRole", 
            assumed_by=iam.AccountRootPrincipal(),
            role_name="Developer",
        )
        portfolio.give_access_to_role(dev_role)

        # Grant access to an IAM Group
        test_group = iam.Group(self, "TestGroup", 
            group_name="Testers",
        )
        portfolio.give_access_to_group(test_group)
