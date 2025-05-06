#!/usr/bin/env python3
import os
import aws_cdk as cdk
from aws_cdk import Aspects
from cdk_nag import AwsSolutionsChecks, NagSuppressions

from cloudfront_v2_logging.cloudfront_v2_logging_stack import CloudfrontV2LoggingStack

app = cdk.App()
stack = CloudfrontV2LoggingStack(app, "CloudfrontV2LoggingStack")

# Add CDK-NAG to check for best practices
Aspects.of(app).add(AwsSolutionsChecks())

# Add suppressions at the stack level
NagSuppressions.add_stack_suppressions(
    stack,
    [
        {
            "id": "AwsSolutions-IAM4",
            "reason": "Suppressing managed policy warning as permissions are appropriate"
        },
        {
            "id": "AwsSolutions-L1",
            "reason": "Lambda runtime is 3.11 and managed by CDK BucketDeployment construct, and so out of scope for this project"
        },
        {
            "id": "AwsSolutions-CFR1",
            "reason": "Geo restrictions not required for this demo"
        },
        {
            "id": "AwsSolutions-CFR2",
            "reason": "WAF integration not required for this demo"
        },
        {
            "id": "AwsSolutions-CFR3",
            "reason": "Using CloudFront V2 logging instead of traditional access logging"
        },
        {
            "id": "AwsSolutions-S1",
            "reason": "S3 access logging not required for this demo as we're demonstrating CloudFront V2 logging"
        },
        {
            "id": "AwsSolutions-IAM5",
            "reason": "Wildcard permissions are required for PUT actions for the CDK BucketDeployment construct and Firehose role"
        },
        {
            "id": "AwsSolutions-CFR4",
            "reason": "Using TLSv1.2_2021 security policy which is the latest supported version."
        }
    ]
)

app.synth()