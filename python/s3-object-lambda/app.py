from aws_cdk import App
from stacks.s3_object_lambda_stack import S3ObjectLambdaStack

app = App()
S3ObjectLambdaStack(app, "S3ObjectLambdaExample")
app.synth()
