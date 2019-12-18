#!/usr/bin/env python3

from aws_cdk import core

from cdk_vpc_ec2.cdk_vpc_stack import CdkVpcStack
from cdk_vpc_ec2.cdk_ec2_stack import CdkEc2Stack

app = core.App()
aVpcStack = CdkVpcStack(app, "cdk-vpc")
CdkEc2Stack(app, "cdk-ec2", vpc=aVpcStack.vpc)

app.synth()
