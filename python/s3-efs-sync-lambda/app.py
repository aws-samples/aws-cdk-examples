from aws_cdk import App, Stack

from stack.lambda_data_sync_efs_s3 import LambdaDataSyncStack

app = App()
LambdaDataSyncStack(app, "lambda-data-sync-efs-s3")

app.synth()
