from aws_cdk import (
    aws_lambda as lambda_,
    aws_s3 as s3,
    core,
)

# Creates reference to already existing s3 bucket and lambda code


class BeerCode(core.Stack):
    def __init__(self, app: core.App, id: str) -> None:
        super().__init__(app, id)

        lambda_code_bucket = s3.Bucket.from_bucket_attributes(
            self, "LambdaCodeBucket", bucket_name="john-mitchell-lambda-code-bucket"
        )
        myLambda = self.make_lambda(lambda_code_bucket)

class FunctionCode1(BeerCode):

    def make_lambda(self, code_bucket):
        return lambda_.Function(
            self,
            "Singleton",
            handler="hello.handler",
            code=lambda_.S3Code(bucket=code_bucket, key="lambda.zip"),
            runtime=lambda_.Runtime.PYTHON_3_7,
            timeout=core.Duration.seconds(300),
            tracing=lambda_.Tracing.ACTIVE
        )


app = core.App()

# for lambda_code in glob.glob('*_mod.py'):
#     # import lambda code
#     FunctionCode1(app, "JohnMitchellLambdaS3CodeExample")

a = FunctionCode1(app, "JohnMitchellLambdaS3CodeExample")
# b = FunctionCode2()
# LambdaS3Code(app, "JohnMitchellLambdaS3CodeExample")
app.synth()
