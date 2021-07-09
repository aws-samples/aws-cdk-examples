#!/usr/bin/env python3

from aws_cdk import core

from stack.cdk import ImageContentSearchStack

app = core.App()
ImageContentSearchStack(app, "ImageContentSearch", env={'region': 'eu-central-1'})

app.synth()
