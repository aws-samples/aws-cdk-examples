'''
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
'''

import aws_cdk as cdk
from stacks.apigw_http_api_lambda_dynamodb_python_cdk_stack import ApigwHttpApiLambdaDynamodbPythonCdkStack

app = cdk.App()
ApigwHttpApiLambdaDynamodbPythonCdkStack(app, "ApigwHttpApiLambdaDynamodbPythonCdkStack")
app.synth()
