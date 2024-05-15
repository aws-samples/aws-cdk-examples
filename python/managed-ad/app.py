#!/usr/bin/env python3
import os

import aws_cdk as cdk

from managed_ad.managed_ad_stack import ManagedAdStack

app = cdk.App()
ManagedAdStack(app, "ManagedAdStack")
app.synth()
