"""Unit tests for the pipeline-smoke-test example.

These assert the wiring that makes the example correct: the API requires IAM
auth, the smoke-test role is least-privilege, and the pipeline runs the smoke
test after the deployment rather than before it.
"""

import aws_cdk as cdk
import aws_cdk.assertions as assertions
import pytest

from pipeline_smoke_test.pipeline_stack import PipelineStack
from pipeline_smoke_test.service_stack import ServiceStack


@pytest.fixture
def service_template() -> assertions.Template:
    app = cdk.App()
    stack = ServiceStack(app, "Service")
    return assertions.Template.from_stack(stack)


@pytest.fixture
def pipeline_template() -> assertions.Template:
    app = cdk.App()
    stack = PipelineStack(
        app,
        "PipelineSmokeTestStack",
        env=cdk.Environment(account="123456789012", region="us-east-1"),
    )
    return assertions.Template.from_stack(stack)


def test_api_method_requires_iam_auth(service_template):
    """The endpoint must reject unsigned requests.

    This is what makes the assumed role load-bearing. If the method were
    public, the smoke test would pass without credentials and prove nothing
    about the role the deployment created.
    """
    service_template.has_resource_properties(
        "AWS::ApiGateway::Method",
        {
            "HttpMethod": "GET",
            "AuthorizationType": "AWS_IAM",
        },
    )


def test_smoke_test_role_is_created_under_the_expected_path(service_template):
    """The path is what the pipeline's sts:AssumeRole grant is scoped to."""
    service_template.has_resource_properties(
        "AWS::IAM::Role",
        {
            "Path": "/smoke-test/",
        },
    )


def test_smoke_test_role_can_only_invoke_the_api(service_template):
    """The role's whole permission set is one execute-api:Invoke action."""
    service_template.has_resource_properties(
        "AWS::IAM::Policy",
        {
            "PolicyDocument": {
                "Statement": [
                    {
                        "Action": "execute-api:Invoke",
                        "Effect": "Allow",
                    },
                ],
            },
        },
    )


def test_stack_exports_the_values_the_smoke_test_needs(service_template):
    """Both outputs must exist -- env_from_cfn_outputs reads them by reference."""
    outputs = service_template.find_outputs("*")
    assert "ApiUrl" in outputs
    assert "SmokeTestRoleArn" in outputs


def test_smoke_test_runs_after_the_deployment(pipeline_template):
    """The smoke test must be a post step, not a pre step.

    Asserted on the rendered CodePipeline: the SmokeTest action has to sit in
    the same stage as the deployment and carry a higher RunOrder, otherwise it
    would run against infrastructure that is not up yet.
    """
    stages = pipeline_template.find_resources("AWS::CodePipeline::Pipeline")
    (pipeline,) = stages.values()

    prod_stage = next(
        stage
        for stage in pipeline["Properties"]["Stages"]
        if stage["Name"] == "Prod"
    )
    actions = {action["Name"]: action for action in prod_stage["Actions"]}

    assert "SmokeTest" in actions, "the smoke test should run in the Prod stage"

    smoke_run_order = actions["SmokeTest"]["RunOrder"]
    deploy_run_orders = [
        action["RunOrder"]
        for name, action in actions.items()
        if name != "SmokeTest"
    ]
    assert smoke_run_order > max(deploy_run_orders), (
        "the smoke test must run after every deploy action in the stage"
    )


def test_smoke_test_step_may_only_assume_smoke_test_roles(pipeline_template):
    """The step gets sts:AssumeRole on the smoke-test path and nothing wider."""
    policies = pipeline_template.find_resources("AWS::IAM::Policy")

    assume_role_resources = [
        statement["Resource"]
        for policy in policies.values()
        for statement in policy["Properties"]["PolicyDocument"]["Statement"]
        if statement.get("Action") == "sts:AssumeRole"
    ]

    assert assume_role_resources, "the smoke-test step needs sts:AssumeRole"

    # The grant is rendered as a Fn::Join over the account id. Flatten it to a
    # string so the path can be asserted regardless of how CDK splits it.
    flattened = str(assume_role_resources)
    assert "smoke-test/*" in flattened
    assert ":root" not in flattened, "the grant must not target the account root"
