from aws_cdk import (
    aws_s3 as s3,
    core as cdk
)

from my_custom_resource import MyCustomResource

# A Stack that sets up MyCustomResource and shows how to get an
# attribute from it.

class MyStack(cdk.Stack):
    def __init__(self, scope: cdk.App, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # Create s3 bucket
        bucket = s3.Bucket(self, "CustomResourceTestBucket",
                           encryption=s3.BucketEncryption.S3_MANAGED, block_public_access=s3.BlockPublicAccess.BLOCK_ALL)

        resource = MyCustomResource(
            self, "MyCustomResource",
            bucket_name=bucket.bucket_name
        )

app = cdk.App()
MyStack(app, "CustomResourceDemoStack")
app.synth()