#!/usr/bin/env python3

from aws_cdk import core
from stepfunctions.stepfunctions_stack import JobPollerStack

app = core.App()
JobPollerStack(app, "aws-stepfunctions-integ")
app.synth()
