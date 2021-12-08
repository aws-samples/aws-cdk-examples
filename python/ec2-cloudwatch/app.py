#!/usr/bin/env python3

from aws_cdk import App
from ec2_cloudwatch.ec2_cloudwatch_stack import Ec2CloudwatchStack

app = App()

# # Replace the accoount and region with your information
# env = core.Environment(account="You account information", region="cn-northwest-1")
# Ec2CloudwatchStack(app, "ec2-cloudwatch", env=env)

Ec2CloudwatchStack(app, "ec2-cloudwatch")
app.synth()
