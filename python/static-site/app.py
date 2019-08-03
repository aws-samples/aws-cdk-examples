#!/usr/bin/env python3

from aws_cdk import core

from static_site.static_site_stack import MyStack


app = core.App()
MyStack(app, "static-site-cdk-2", env={'region': 'us-east-1'})

app.synth()
