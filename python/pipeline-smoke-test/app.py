#!/usr/bin/env python3
import os

import aws_cdk as cdk

from pipeline_smoke_test.pipeline_stack import PipelineStack

app = cdk.App()

# A CDK Pipeline needs a concrete account and region: it looks up the deploy
# role for each stage at synthesis time, so it cannot be environment-agnostic.
PipelineStack(
    app,
    "PipelineSmokeTestStack",
    env=cdk.Environment(
        account=os.getenv("CDK_DEFAULT_ACCOUNT"),
        region=os.getenv("CDK_DEFAULT_REGION"),
    ),
)

app.synth()
