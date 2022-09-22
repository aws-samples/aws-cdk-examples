import boto3
import botocore.config

aws_config = botocore.config.Config(inject_host_prefix=False)


def main(event, context):
    client = boto3.client('evidently', endpoint_url='http://localhost:2772', config=aws_config)
    evaluation = client.evaluate_feature(
        project='EvidentlyExampleProject',
        feature='MyExampleFeature',
        entityId='someUserId'
    )
    return evaluation
