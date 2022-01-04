from aws_cdk import (
    core as cdk,
)

from stacks.s3_object_lambda_stack import S3ObjectLambdaStack

app = cdk.App()
S3ObjectLambdaStack(app, "S3ObjectLambdaExample")
app.synth()
