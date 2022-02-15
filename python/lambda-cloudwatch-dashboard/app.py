#!/usr/bin/env python3
from aws_cdk import App
from lambda_cloudwatch_dashboard.lambda_cloudwatch_dashboard_stack import LambdaCloudwatchDashboardStack


app = App()
LambdaCloudwatchDashboardStack(app, "LambdaCloudwatchDashboardStack")
app.synth()
