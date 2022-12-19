from aws_cdk import (
    Aws, CfnOutput, Stack,
    aws_lambda,
    aws_cloudwatch,
    aws_iam
)
from constructs import Construct

class LambdaCloudwatchDashboardStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        example_dashboard_name = "ExampleLambdaDashboard"

        # Create Example Lambda function
        lambda_function = aws_lambda.Function(self, "lambda_function",
                                    runtime=aws_lambda.Runtime.PYTHON_3_7,
                                    handler="lambda-handler.main",
                                    code=aws_lambda.Code.from_asset("./lambda"))

        assert lambda_function.role is not None
        lambda_function.role.add_managed_policy(
            aws_iam.ManagedPolicy.from_aws_managed_policy_name("service-role/AWSLambdaBasicExecutionRole")
        )

        # Create CloudWatch Dashboard to view Lambda Function Metrics
        cw_dashboard = aws_cloudwatch.Dashboard(self, "Lambda Dashboard",
            dashboard_name=example_dashboard_name
        )
        # CloudWatch Dashboard Title
        title_widget = aws_cloudwatch.TextWidget(
            markdown="# Dashboard: {}".format(lambda_function.function_name),
            height=1,
            width=24
        )
        # Create Widgets for CloudWatch Dashboard based on Lambda Function's CloudWatch Metrics
        invocations_widget = aws_cloudwatch.GraphWidget(title= "Invocations",
            left=[lambda_function.metric_invocations()],
            width=24)

        errors_widget = aws_cloudwatch.GraphWidget(title= "Errors",
            left=[lambda_function.metric_errors()],
            width=24)

        duration_widget = aws_cloudwatch.GraphWidget(title= "Duration",
            left=[lambda_function.metric_duration()],
            width=24)

        throttles_widget = aws_cloudwatch.GraphWidget(title= "Throttles",
            left=[lambda_function.metric_throttles()],
            width=24)

        # Create Widget to show last 20 Log Entries
        log_widget = aws_cloudwatch.LogQueryWidget(log_group_names=[lambda_function.log_group.log_group_name],
            query_lines=["fields @timestamp, @message", "sort @timestamp desc", "limit 20"], width=24)

        # Add Widgets to CloudWatch Dashboard
        cw_dashboard.add_widgets(title_widget,
                                 invocations_widget,
                                 errors_widget,
                                 duration_widget,
                                 throttles_widget,
                                 log_widget)

        # Output Dashboard URL
        cloudwatch_dasboard_url = 'https://{}.console.aws.amazon.com/cloudwatch/home?region={}#dashboards:name={}'.format(
            Aws.REGION,
            Aws.REGION,
            example_dashboard_name
        )
        CfnOutput(self,"DashboardOutput",
            value=cloudwatch_dasboard_url,
            description="URL of Sample CloudWatch Dashboard",
            export_name="SampleCloudWatchDashboardURL")

        CfnOutput(self,"LambdaName",
            value=lambda_function.function_name,
            description="Name of the sample Lambda Function",
            export_name="LambdaName")

