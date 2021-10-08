import pathlib

import pytest

from aws_cdk import (
    core as cdk,
    assertions
)

from s3_sns_sqs_lambda_chain_stack import S3SnsSqsLambdaChainStack


@pytest.fixture
def template():
    """
    Generate a mock stack that embeds the orchestrator construct for testing
    """
    script_dir = pathlib.Path(__file__).parent
    lambda_dir = str(script_dir.joinpath("..", "..", "lambda"))

    app = cdk.App()
    stack = S3SnsSqsLambdaChainStack(
        app,
        "s3-sns-sqs-lambda-stack",
        lambda_dir=lambda_dir
    )

    return assertions.Template.from_stack(stack)


def test_sns_topic_created(template):
    """
    Test for SNS Topic and Subscription: S3 Upload Event Notification
    """

    template.resource_count_is("AWS::SNS::Subscription", 1)
    template.resource_count_is("AWS::SNS::Topic", 1)
    template.resource_count_is("AWS::SNS::TopicPolicy", 1)


def test_sqs_queue_created(template):
    """
    Test for SQS Queue:
        - Queue to process uploads
        - Dead-letter Queue
    """
    template.resource_count_is("AWS::SQS::Queue", 2)
    template.resource_count_is("AWS::SQS::QueuePolicy", 1)


def test_s3_bucket_with_event_notification_created(template):
    """
    Test for S3 Bucket:
        - Upload Bucket
    """
    template.resource_count_is("Custom::S3BucketNotifications", 1)
    template.resource_count_is("AWS::S3::Bucket", 1)


def test_lambdas_created(template):
    """
    Test for Lambdas created:
        - Sample Lambda
        - Bucket Notification Handler (automatically provisioned)
    """
    template.resource_count_is("AWS::Lambda::Function", 2)
    template.resource_count_is("AWS::Lambda::EventSourceMapping", 1)
