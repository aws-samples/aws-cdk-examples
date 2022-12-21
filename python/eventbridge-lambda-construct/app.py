#!/usr/bin/env python3
import os
import aws_cdk as cdk
import json

from stack.eventbridge_lambda_construct_stack import EventbridgeLambdaConstructStack

app = cdk.App()

with open("secrets.json") as config_file:
    config = json.load(config_file)

app = cdk.App()
env_ = cdk.Environment(account=config['account'], region=config['region'])

EventbridgeLambdaConstructStack(app, "EventBridgeServicesStack", env=env_)

app.synth()
