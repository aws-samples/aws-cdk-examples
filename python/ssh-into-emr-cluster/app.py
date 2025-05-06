#!/usr/bin/env python3
import aws_cdk as cdk

from emr_pattern.emr_pattern_stack import EmrPatternStack

app = cdk.App()

EmrPatternStack(
    app,
    "EmrPatternStack",
    ssh_origin_ip=None  # Leave as is or pass in your IP as a string: "12.34.56.78"
)

app.synth()
