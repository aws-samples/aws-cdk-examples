from aws_cdk import (
    aws_lambda as lambda_,
    aws_s3 as s3,
    App, Duration, Stack
)

# Creates reference to already existing s3 bucket and lambda code

class LambdaS3Code(Stack):
    def __init__(self, app: App, id: str) -> None:
        super().__init__(app, id)

        lambda_code_bucket = s3.Bucket.from_bucket_attributes(
            self, 'LambdaCodeBucket',
            bucket_name='my-lambda-code-bucket'
        )

        lambdaFn = lambda_.Function(
            self, 'Singleton',
            handler='index.main',
            code=lambda_.S3Code(
                bucket=lambda_code_bucket,
                key='my-lambda.py'
            ),
            runtime=lambda_.Runtime.PYTHON_3_7,
            timeout=Duration.seconds(300)
        )


app = App()
LambdaS3Code(app, "LambdaS3CodeExample")
app.synth()
