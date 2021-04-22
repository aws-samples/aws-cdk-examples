#!/usr/bin/env python3

import aws_cdk as core

from api_sqs_lambda.api_sqs_lambda_stack import ApiSqsLambdaStack


app = core.App()
ApiSqsLambdaStack(app, "ApiSqsLambdaStack")

app.synth()
