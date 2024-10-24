#!/usr/bin/env python3
import aws_cdk as cdk

from amazon_connect.amazon_connect_stack import AmazonConnectStack


app = cdk.App()

AmazonConnectStack(app, "AmazonConnectStack")

app.synth()
