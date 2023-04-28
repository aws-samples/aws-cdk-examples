'''
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
'''

import aws_cdk as cdk
from stacks.opensearch_serverless_stack import OpensearchServerlessStack


app = cdk.App()
OpensearchServerlessStack(app, "OpensearchServerlessStack")
app.synth()
