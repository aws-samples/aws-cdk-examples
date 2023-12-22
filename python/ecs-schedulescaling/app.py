#!/usr/bin/env python3

import aws_cdk as cdk

from schedulescaling.schedulescaling_stack import SchedulescalingStack

app = cdk.App()
SchedulescalingStack(app, "SchedulescalingStack")

app.synth()
