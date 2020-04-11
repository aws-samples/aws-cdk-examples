#!/usr/bin/env python3

from aws_cdk import core

from dynamodbtrigger.dynamodbtrigger_stack import DynamoDbTriggerStack

app = core.App()
DynamoDbTriggerStack(app, "DynamoDbTrigger")

app.synth()
