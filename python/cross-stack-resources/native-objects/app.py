#!/usr/bin/env python3

from aws_cdk import App

from native_objects.application_stack import ApplicationStack
from native_objects.infrastructure_stack import InfrastructureStack


app = App()

env={'region': 'us-west-2'}
# Base infrastructure stack, Lambda Functions, DynamoDB Tables, etc....
infra = InfrastructureStack(app, "infrastructure", env=env)

# Application stack that generally changes independently of the underlying infrastructure stack
application = ApplicationStack(app, "application", referenced_function=infra.main_function, env=env)

app.synth()
