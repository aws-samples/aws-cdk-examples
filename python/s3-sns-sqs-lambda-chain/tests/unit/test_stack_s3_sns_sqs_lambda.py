import pathlib

import aws_cdk as cdk
import pytest

from s3_sns_sqs_lambda_chain_stack import S3SnsSqsLambdaChainStack # type: ignore


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

    return cdk.assertions.Template.from_stack(stack)


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
        - Log Retention (automatically provisioned)
    """
    template.resource_count_is("AWS::Lambda::Function", 3)
    template.resource_count_is("AWS::Lambda::EventSourceMapping", 1)


def test_outputs_created(template):
    """
    Test for CloudFormation Outputs
      - Upload File To S3 Instructions
      - Queue Url
      - Lambda Function Name
      - Lambda Function Log Group Name
    """
    template.has
    template.has_output("UploadFileToS3Example", {})
    template.has_output("UploadSqsQueueUrl", {})
    template.has_output("LambdaFunctionName", {})
    template.has_output("LambdaFunctionLogGroupName", {})
