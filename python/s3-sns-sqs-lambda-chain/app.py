#!/usr/bin/env python3
import aws_cdk as cdk
from s3_sns_sqs_lambda_chain.s3_sns_sqs_lambda_chain_stack import S3SnsSqsLambdaChainStack

app = cdk.App()
S3SnsSqsLambdaChainStack(
    app,
    "s3-sns-sqs-lambda-stack",
    lambda_dir="lambda"
)

app.synth()
