#!/usr/bin/env python3

from aws_cdk import App, Environment

from cdk_vpc_ec2.cdk_vpc_ec2_stack import CdkVpcEc2Stack

# Define your account id to make import vpc work
env_cn = Environment(account="YOUR_ACCOUNT_ID_WITHOUT_HYPHEN", region="cn-northwest-1")

app = App()
CdkVpcEc2Stack(app, "cdk-vpc-ec2", env=env_cn)

app.synth()
