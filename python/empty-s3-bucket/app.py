#!/usr/bin/env python3
from aws_cdk import core
from empty_s3_bucket.stepfunctions_empty_s3_bucket_stack import EmptyS3BucketStack


app = core.App()
EmptyS3BucketStack(app, "aws-empty-s3-bucket")
app.synth()