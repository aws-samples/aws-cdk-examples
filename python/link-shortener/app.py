#!/usr/bin/env python3

from aws_cdk import core

from shortener.shortener_stack import MyStack


app = core.App()
MyStack(app, "shortener-cdk-1", env={'region': 'us-east-2'})

app.synth()
