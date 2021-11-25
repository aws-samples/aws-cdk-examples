#!/usr/bin/env python3

from aws_cdk import App

from api_sqs_lambda.api_sqs_lambda_stack import ApiSqsLambdaStack


app = App()
ApiSqsLambdaStack(app, "ApiSqsLambdaStack")

app.synth()
