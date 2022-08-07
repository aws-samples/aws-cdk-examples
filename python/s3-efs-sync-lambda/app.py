from aws_cdk import core

from stack.lambda_data_sync_efs_s3 import LambdaDataSyncStack

app = core.App()
LambdaDataSyncStack(app, "lambda-data-sync-efs-s3")

app.synth()
