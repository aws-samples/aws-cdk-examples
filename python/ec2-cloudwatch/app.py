#!/usr/bin/env python3

from aws_cdk import core

from ec2_cloudwatch.ec2_cloudwatch_stack import Ec2CloudwatchStack
import os


app = core.App()

# # try to get your AWS information from OS
# ACCOUNT = app.node.try_get_context('account') or os.environ.get('CDK_DEFAULT_ACCOUNT', 'unkonw')
# REGION = app.node.try_get_context('region') or os.environ.get('CDK_DEFAULT_REGION', 'unkonw')
# env_CN = core.Environment(account=ACCOUNT, region=REGION)

# # or you can write the information in the code
# env_CN = core.Environment(account="You account information", region="cn-northwest-1")
# Ec2CloudwatchStack(app, "ec2-cloudwatch", env=env_CN)

Ec2CloudwatchStack(app, "ec2-cloudwatch")
app.synth()
