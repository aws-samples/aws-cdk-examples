from aws_cdk import (
    core,
    aws_ec2 as ec2
)

class VpcStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, 
        vpc_cidr, 
        **kwargs
    ) -> None:
        super().__init__(scope, id, **kwargs)

        # SubnetType.ISOLATED used as we don't want Internet traffic possible for this demo
        self.vpc = ec2.Vpc(self, "VPC",
           max_azs = 2,
           cidr = vpc_cidr,
           subnet_configuration = [
               ec2.SubnetConfiguration(
                   subnet_type = ec2.SubnetType.ISOLATED,
                   name = "PrivateIngress",
                   cidr_mask = 28
               ), ec2.SubnetConfiguration(
                   subnet_type = ec2.SubnetType.ISOLATED,
                   name = "DB",
                   cidr_mask = 28
               )
           ],
       )
        core.CfnOutput(self, "Output",
           value = self.vpc.vpc_id)