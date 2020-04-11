from aws_cdk import (
    aws_lambda as _lambda,
    aws_dynamodb as dynamodb,
    aws_lambda_event_sources as lambda_event_sources,
    core
)


class DynamoDbTriggerStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # Create Lambda function
        function = _lambda.Function(
            self, 'LambdaFunction',
            runtime = _lambda.Runtime.PYTHON_3_7,
            handler = 'lambda-handler.main',
            code = _lambda.Code.asset(
                './lambda'
            ),
            timeout = core.Duration.seconds(300),
        )

        # Create DynamoDB table
        table = dynamodb.Table(
            self, 'DynamoDbTable',
            table_name = 'SampleTable',
            partition_key = dynamodb.Attribute(
                name = 'MainKey',
                type = dynamodb.AttributeType.STRING
            ),
            billing_mode = dynamodb.BillingMode.PAY_PER_REQUEST,
            stream = dynamodb.StreamViewType.NEW_IMAGE,
            removal_policy = core.RemovalPolicy.DESTROY
        )
        
        # Add table as trigger for Lambda function
        function.add_event_source(
            lambda_event_sources.DynamoEventSource(
                table = table,
                starting_position = _lambda.StartingPosition.LATEST,
                retry_attempts = 5,
                max_record_age = core.Duration.hours(1)
            )
        )
