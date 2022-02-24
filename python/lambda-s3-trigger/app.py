#!/usr/bin/env python3

from aws_cdk import App

from s3trigger.s3trigger_stack import S3TriggerStack

app = App()
S3TriggerStack(app, "s3trigger")

app.synth()
