import boto3
import botocore.config

# We must disable host prefix injection because the Evidently SDK automatically adds an unnecessary prefix to localhost
aws_config = botocore.config.Config(inject_host_prefix=False)


def main(event, context):
    # Instead of calling the Evidently API to determine the feature variation, we call the AppConfig extension that we
    # added to our Lambda function. This layer is essentially a local server we can call in place of the API.
    # By default, the AppConfig extension runs on port 2772. This is configurable:
    # https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-integration-lambda-extensions.html#w97aac17b7c21c21
    client = boto3.client('evidently', endpoint_url='http://localhost:2772', config=aws_config)
    evaluation = client.evaluate_feature(
        project='EvidentlyExampleProject',
        feature='MyExampleFeature',
        entityId='someUserId'
    )
    return evaluation
