from aws_cdk import Aws, CfnOutput, Duration, Stack, aws_cloudwatch, aws_iam, aws_lambda
from constructs import Construct


class LambdaCloudwatchDashboardStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        example_dashboard_name = "ExampleLambdaDashboard"

        # Lambda function Code
        lambda_inline_code = """
import time
import random

def lambda_handler(event, context):
    print(event) # save event to logs
    time.sleep(random.uniform(3, 8)) # simulate work
    if random.uniform(0, 1) < 0.1: # simulate error
        raise ValueError("Random error")
    return {
        "statusCode": 200,
        "body": "OK"
    }
"""
        # Create Example Lambda function
        lambda_function = aws_lambda.Function(
            self,
            "lambda_function",
            runtime=aws_lambda.Runtime.PYTHON_3_13,
            handler="index.lambda_handler",
            code=aws_lambda.Code.from_inline(lambda_inline_code),
            reserved_concurrent_executions=4,
            timeout=Duration.seconds(12),
        )

        assert lambda_function.role is not None
        lambda_function.role.add_managed_policy(
            aws_iam.ManagedPolicy.from_aws_managed_policy_name(
                "service-role/AWSLambdaBasicExecutionRole"
            )
        )

        # Create CloudWatch Dashboard to view Lambda Function Metrics
        cw_dashboard = aws_cloudwatch.Dashboard(
            self, "Lambda Dashboard", dashboard_name=example_dashboard_name
        )
        # CloudWatch Dashboard Title
        title_widget = aws_cloudwatch.TextWidget(
            markdown=f"# Dashboard: {lambda_function.function_name}", height=1, width=24
        )
        # Create Widgets for CloudWatch Dashboard
        # based on Lambda Function's CloudWatch Metrics
        invocations_widget = aws_cloudwatch.GraphWidget(
            title="Invocations",
            left=[
                lambda_function.metric_invocations(
                    statistic="sum", period=Duration.minutes(1)
                )
            ],
            width=8,
            height=6,
        )

        duration_widget = aws_cloudwatch.GraphWidget(
            title="Duration",
            left=[lambda_function.metric_duration()],
            width=8,
            height=6,
        )

        throttles_widget = aws_cloudwatch.GraphWidget(
            title="Throttles",
            left=[lambda_function.metric_throttles()],
            width=8,
            height=6,
        )

        errors_widget = aws_cloudwatch.GraphWidget(
            title="Errors",
            left=[
                lambda_function.metric_errors(
                    statistic="sum", period=Duration.minutes(1)
                )
            ],
            width=8,
            height=6,
        )

        # Create Widget to show last 20 Log Entries
        log_widget = aws_cloudwatch.LogQueryWidget(
            log_group_names=[lambda_function.log_group.log_group_name],
            query_lines=[
                "fields @timestamp, @message",
                "sort @timestamp desc",
                "limit 20",
            ],
            width=16,
            height=6,
        )

        # Add Widgets to CloudWatch Dashboard
        cw_dashboard.add_widgets(
            title_widget,
            invocations_widget,
            errors_widget,
            duration_widget,
            throttles_widget,
            log_widget,
        )

        # Output Dashboard URL
        cloudwatch_dasboard_url = f"https://{Aws.REGION}.console.aws.amazon.com/cloudwatch/home?region={Aws.REGION}#dashboards:name={example_dashboard_name}"
        CfnOutput(
            self,
            "DashboardOutput",
            value=cloudwatch_dasboard_url,
            description="URL of Sample CloudWatch Dashboard",
            export_name="SampleCloudWatchDashboardURL",
        )

        CfnOutput(
            self,
            "LambdaARN",
            value=lambda_function.function_arn,
            description="ARN of the sample Lambda Function",
            export_name="CloudwatchDashboardLambdaARN",
        )
