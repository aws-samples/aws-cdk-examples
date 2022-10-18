#!/usr/bin/env python3

import aws_cdk as cdk

from msk_demo.msk_demo_stack import MskDemoStack


app = cdk.App()
MskDemoStack(app, "msk-demo")

app.synth()