from aws_cdk import (
    core,
    aws_lambda,
    aws_dynamodb,
    aws_events,
    aws_events_targets,
)


class DynamodbLambdaStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # create dynamo table
        demo_table = aws_dynamodb.Table(
            self, "demo_table",
            partition_key=aws_dynamodb.Attribute(
                name="id",
                type=aws_dynamodb.AttributeType.STRING
            )
        )

        # create producer lambda function
        producer_lambda = aws_lambda.Function(self, "producer_lambda_function",
                                              runtime=aws_lambda.Runtime.PYTHON_3_6,
                                              handler="lambda_function.lambda_handler",
                                              code=aws_lambda.Code.asset("./lambda/producer"))

        producer_lambda.add_environment("TABLE_NAME", demo_table.table_name)

        # grant permission to lambda to write to demo table
        demo_table.grant_write_data(producer_lambda)

        # create consumer lambda function
        consumer_lambda = aws_lambda.Function(self, "consumer_lambda_function",
                                              runtime=aws_lambda.Runtime.PYTHON_3_6,
                                              handler="lambda_function.lambda_handler",
                                              code=aws_lambda.Code.asset("./lambda/consumer"))

        consumer_lambda.add_environment("TABLE_NAME", demo_table.table_name)

        # grant permission to lambda to read from demo table
        demo_table.grant_read_data(consumer_lambda)

        # create a Cloudwatch Event rule
        one_minute_rule = aws_events.Rule(
            self, "one_minute_rule",
            schedule=aws_events.Schedule.rate(core.Duration.minutes(1)),
        )

        # Add target to Cloudwatch Event
        one_minute_rule.add_target(aws_events_targets.LambdaFunction(producer_lambda))
        one_minute_rule.add_target(aws_events_targets.LambdaFunction(consumer_lambda))
