#!/usr/bin/env python3

import aws_cdk as cdk

from fargate_service_with_efs.fargate_service_with_efs_stack import FargateServiceWithEfsStack


app = cdk.App()
FargateServiceWithEfsStack(app, "FargateServiceWithEfsStack")

app.synth()
