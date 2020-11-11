#!/usr/bin/env python3

from aws_cdk import core

from aws_transfer import CustomIdpStack, SecretsStack, TransferStack

app = core.App()

stack = CustomIdpStack(app, "aws-transfer-custom-idp-cdk")

transfer_stack=TransferStack(app, "aws-transfer-stack", stack.base_api)

SecretsStack(app, "aws-transfer-secrets-stack", bucket_name=transfer_stack.bucket.bucket_name, role_arn=transfer_stack.transfer_user_iam_role.role_arn)

app.synth()
