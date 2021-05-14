#!/usr/bin/env python3

from aws_cdk import core

from stacks.autopatching_stack import AutoPatchingStack

app = core.App()
AutoPatchingStack(app, "aws-ssm-auto-patching")
app.synth()
