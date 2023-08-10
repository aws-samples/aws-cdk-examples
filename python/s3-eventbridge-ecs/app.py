#!/usr/bin/env python3

import aws_cdk as cdk
from s3_eventbridge_ecs.s3_eventbridge_ecs_stack import S3EventbridgeEcsStack

app = cdk.App()
S3EventbridgeEcsStack(app, "s3-eventbridge-ecs")

app.synth()
