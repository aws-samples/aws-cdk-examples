#!/usr/bin/env python3

from aws_cdk import core

from api_eventbridge_lambda.api_eventbridge_lambda import ApiEventBridgeLambdaStack


app = core.App()
ApiEventBridgeLambdaStack(app, "ApiEventBridgeLambdaStack")

app.synth()
