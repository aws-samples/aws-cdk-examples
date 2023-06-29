import aws_cdk as core
import aws_cdk.assertions as assertions

from stacks.apigw_http_api_lambda_dynamodb_python_cdk_stack import ApigwHttpApiLambdaDynamodbPythonCdkStack


def test_sqs_queue_created():
    app = core.App()
    stack = ApigwHttpApiLambdaDynamodbPythonCdkStack(app, "apigw-http-api-lambda-dynamodb-python-cdk")
    template = assertions.Template.from_stack(stack)

