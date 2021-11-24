#!/usr/bin/env python3

from aws_cdk import core

from s3trigger.s3trigger_stack import S3TriggerStack

app = core.App()
S3TriggerStack(app, "s3trigger")

app.synth()
