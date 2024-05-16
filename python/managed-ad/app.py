#!/usr/bin/env python3
import os

import aws_cdk as cdk
from cdk_nag import (
    AwsSolutionsChecks
)
from managed_ad.managed_ad_stack import ManagedAdStack

app = cdk.App()
ManagedAdStack(app, "ManagedAdStack")
cdk.Aspects.of(app).add(AwsSolutionsChecks())
app.synth()
