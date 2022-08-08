#!/usr/bin/env python3
import os

import aws_cdk as cdk

from ipam_l2_vpc.ipam_stack import IpamStack
from ipam_l2_vpc.vpc_stack import VpcStack 

cidr_range = "11.0.0.0/8"
region_cidr_range = "11.0.0.0/12"

app = cdk.App()


# IPAM stack
IPAM_stack = IpamStack(app, "IPAM-iac",
    cidr_range = cidr_range,
    region_cidr_range = region_cidr_range,
    env=cdk.Environment(
    account=os.environ["CDK_DEFAULT_ACCOUNT"],
    region=os.environ["CDK_DEFAULT_REGION"]))

# VPC stack
vpc_stack = VpcStack(app, "VPC-iac",
    env=cdk.Environment(
    account=os.environ["CDK_DEFAULT_ACCOUNT"],
    region=os.environ["CDK_DEFAULT_REGION"]))

app.synth()
