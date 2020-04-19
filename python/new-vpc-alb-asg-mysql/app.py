#!/usr/bin/env python3

from aws_cdk import core

from cdk_vpc_ec2.cdk_vpc_stack import CdkVpcStack
from cdk_vpc_ec2.cdk_ec2_stack import CdkEc2Stack
from cdk_vpc_ec2.cdk_rds_stack import CdkRdsStack

app = core.App()

vpc_stack = CdkVpcStack(app, "cdk-vpc")
ec2_stack = CdkEc2Stack(app, "cdk-ec2",
                        vpc=vpc_stack.vpc)
rds_stack = CdkRdsStack(app, "cdk-rds",
                        vpc=vpc_stack.vpc,
                        asg_security_groups=ec2_stack.asg.connections.security_groups)

app.synth()
