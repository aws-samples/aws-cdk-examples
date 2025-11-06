#!/usr/bin/env python3

from aws_cdk import App

from lambda_cloudwatch_dashboard.lambda_cloudwatch_dashboard_stack import (
    LambdaCloudwatchDashboardStack,
)
from lambda_cloudwatch_dashboard.stepfunctions_invoker_stack import (
    StepfunctionsInvokerStack,
)

app = App()

lambdastack = LambdaCloudwatchDashboardStack(app, "LambdaCloudwatchDashboardStack")

stepfunctionsstack = StepfunctionsInvokerStack(app, "StepfunctionsInvokerStack")
stepfunctionsstack.add_dependency(lambdastack)

app.synth()
