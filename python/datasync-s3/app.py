#!/usr/bin/env python3

import aws_cdk as cdk

from datasync_s3_to_s3.datasync_s3_to_s3_IAM_stack import DataSyncS3toS3StackIAM
from datasync_s3_to_s3.datasync_s3_to_s3_stack import DataSyncS3toS3Stack


app = cdk.App()

# Create Stack as defined in: datasync_s3_to_s3/datasync_s3_to_s3_IAM_stack.py
iam_stack = DataSyncS3toS3StackIAM(app, "cdk-datasync-s3-to-s3-iam")

# Create Stack as defined in: datasync_s3_to_s3/datasync_s3_to_s3_stack.py
datasync_stack = DataSyncS3toS3Stack(app, "cdk-datasync-s3-to-s3")

# Wait until the IAM stack has completed provisioning
datasync_stack.add_dependency(iam_stack)

app.synth()
