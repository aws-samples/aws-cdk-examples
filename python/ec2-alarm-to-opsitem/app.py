#!/usr/bin/env python3
import os
from aws_cdk import core
from koi.koi_stack import KoiStack

app = core.App()
#env_US = core.Environment(account="362050774589", region="us-east-1")
env_US = core.Environment(account=app.node.try_get_context("acct_context"), 
    region=app.node.try_get_context("region_context")
)

KoiStack(app, "KoiStack", env=env_US)

core.Tag.add(
    scope=app,
    key="OpsItemAlarm",
    value="false",
    include_resource_types=["AWS::EC2::Instance"]
)

app.synth()
