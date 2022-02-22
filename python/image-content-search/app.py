#!/usr/bin/env python3

from aws_cdk import App

from stack.cdk import ImageContentSearchStack

app = App()
ImageContentSearchStack(app, "ImageContentSearch", env={'region': 'eu-central-1'})

app.synth()
