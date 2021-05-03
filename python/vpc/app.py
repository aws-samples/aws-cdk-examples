from aws_cdk import (
    aws_iam as aws_iam,
    aws_s3 as aws_s3,
    core,
)

from base import Base
import os

props = dict(namespace='cdk-examples', region='us-east-1')

env = core.Environment(account=os.environ['CDK_DEFAULT_ACCOUNT'], region=os.environ['CDK_DEFAULT_REGION'])
app = core.App()

base = Base(app, f"{props['namespace']}-vpc", props, env=env)

app.synth()
