#!/usr/bin/env python3
from aws_cdk import core as cdk
from lambda_cloudwatch_dashboard.lambda_cloudwatch_dashboard_stack import LambdaCloudwatchDashboardStack


app = cdk.App()
LambdaCloudwatchDashboardStack(app, "LambdaCloudwatchDashboardStack")
app.synth()
