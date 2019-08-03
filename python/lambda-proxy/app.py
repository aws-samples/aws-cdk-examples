#!/usr/bin/env python3

from aws_cdk import core

from lambda_integration.lambda_stack import LambdaStack


app = core.App()
LambdaStack(app, "lambda-integration-cdk-1", env={'region': 'us-east-2'})

app.synth()
