#!/usr/bin/env python3
import aws_cdk as cdk
from cdk_examples_service_connect.cdk_examples_service_connect_stack import CdkExamplesServiceConnectStack


app = cdk.App()
CdkExamplesServiceConnectStack(app, "CdkExamplesServiceConnectStack")

app.synth()
