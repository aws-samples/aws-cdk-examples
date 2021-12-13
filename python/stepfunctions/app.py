#!/usr/bin/env python3

from aws_cdk import App
from stepfunctions.stepfunctions_stack import JobPollerStack

app = App()
JobPollerStack(app, "aws-stepfunctions-integ")
app.synth()
