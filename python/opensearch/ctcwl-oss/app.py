#!/usr/bin/env python3
import os

import aws_cdk as cdk

"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
"""

from ctcwl_oss.ctcwl_oss_stack import CtcwlOssStack


app = cdk.App()
CtcwlOssStack(app, "CtcwlOssStack")

app.synth()
