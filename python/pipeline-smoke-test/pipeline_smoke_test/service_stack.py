from aws_cdk import (
    CfnOutput,
    Stack,
    aws_apigateway as apigateway,
    aws_iam as iam,
    aws_lambda as lambda_,
)
from constructs import Construct

# Every smoke-test role is created under this IAM path. The pipeline's
# smoke-test step is granted "sts:AssumeRole" on this path only, so it can
# assume the roles this example deploys and nothing else in the account.
SMOKE_TEST_ROLE_PATH = "/smoke-test/"

# Inline handler code. Kept inline on purpose: the example synthesizes with no
# bundler, no Docker, and no asset staging, so "cdk synth" works anywhere.
HANDLER_CODE = """
import json


def handler(event, context):
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"status": "ok", "service": "widget-api"}),
    }
"""


class ServiceStack(Stack):
    """The application under test.

    A Lambda function behind a REST API. The API method requires IAM
    authentication, which is what makes the smoke test meaningful: an
    unsigned request is rejected with 403, so the test can only pass by
    assuming the role deployed below and signing its request with those
    credentials.
    """

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        handler = lambda_.Function(
            self,
            "WidgetHandler",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="index.handler",
            code=lambda_.Code.from_inline(HANDLER_CODE),
        )

        api = apigateway.RestApi(
            self,
            "WidgetApi",
            rest_api_name="Widget Service",
            description="Deployed by the pipeline, then verified by a smoke test.",
            # Requests must be SigV4-signed by an IAM principal. Without this
            # the smoke test could pass with no credentials at all, and the
            # assumed role would prove nothing.
            default_method_options=apigateway.MethodOptions(
                authorization_type=apigateway.AuthorizationType.IAM,
            ),
            deploy_options=apigateway.StageOptions(stage_name="prod"),
        )
        api.root.add_method("GET", apigateway.LambdaIntegration(handler))

        # The role the smoke test assumes. It is deployed as part of this
        # stack -- the same deployment that creates the API also creates the
        # only identity allowed to call it.
        #
        # AccountRootPrincipal does not grant access to everyone in the
        # account: it delegates the decision to IAM, so a principal also needs
        # its own "sts:AssumeRole" permission for this role. The pipeline step
        # is granted exactly that in pipeline_stack.py.
        smoke_test_role = iam.Role(
            self,
            "SmokeTestRole",
            path=SMOKE_TEST_ROLE_PATH,
            assumed_by=iam.AccountRootPrincipal(),
            description="Least-privilege role used only to smoke test the deployed API.",
        )

        # The role's entire permission set: invoke this one API method.
        smoke_test_role.add_to_policy(
            iam.PolicyStatement(
                actions=["execute-api:Invoke"],
                resources=[api.arn_for_execute_api(method="GET", path="/", stage="prod")],
            )
        )

        # These two outputs are how the pipeline hands deployed values to the
        # smoke-test step. See "env_from_cfn_outputs" in pipeline_stack.py.
        self.api_url_output = CfnOutput(self, "ApiUrl", value=api.url)
        self.smoke_test_role_arn_output = CfnOutput(
            self, "SmokeTestRoleArn", value=smoke_test_role.role_arn
        )
