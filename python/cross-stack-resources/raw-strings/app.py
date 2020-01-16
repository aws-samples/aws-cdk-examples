#!/usr/bin/env python3

from aws_cdk import core

from raw_strings.application_stack import ApplicationStack
from raw_strings.infrastructure_stack import InfrastructureStack


app = core.App()

env={'region': 'us-west-2'}
# Base infrastructure stack, Lambda Functions, DynamoDB Tables, etc....
infra = InfrastructureStack(app, "infrastructure", env=env)

# Application stack that generally changes independently of the underlying infrastructure stack
application = ApplicationStack(app, "application", lambda_arn=infra.main_function_arn, env=env)

app.synth()
