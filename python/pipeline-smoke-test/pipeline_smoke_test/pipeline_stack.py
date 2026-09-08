from aws_cdk import (
    Stack,
    aws_codepipeline as codepipeline,
    aws_iam as iam,
    pipelines,
)
from constructs import Construct

from pipeline_smoke_test.service_stack import SMOKE_TEST_ROLE_PATH
from pipeline_smoke_test.service_stage import ServiceStage

# Replace these two with your own repository and CodeStar connection before
# deploying. They are only placeholders so that "cdk synth" runs with no setup.
# Create a connection with:
#   aws codestar-connections create-connection --provider-type GitHub --connection-name my-connection
SOURCE_REPO = "my-org/my-repo"
SOURCE_BRANCH = "main"
SOURCE_CONNECTION_ARN = (
    "arn:aws:codestar-connections:us-east-1:123456789012:connection/EXAMPLE-CONNECTION-ID"
)


class PipelineStack(Stack):
    """A CDK Pipeline that deploys the service, then smoke tests it.

    The smoke test runs as a post-deployment step on the deploy stage. If it
    exits non-zero the stage fails, so a broken deployment does not silently
    count as a success.
    """

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        pipeline = pipelines.CodePipeline(
            self,
            "Pipeline",
            # Set the type explicitly. Leaving it unset selects V1 and emits a
            # warning at synthesis time, because the default is changing.
            pipeline_type=codepipeline.PipelineType.V2,
            synth=pipelines.ShellStep(
                "Synth",
                input=pipelines.CodePipelineSource.connection(
                    SOURCE_REPO,
                    SOURCE_BRANCH,
                    connection_arn=SOURCE_CONNECTION_ARN,
                ),
                commands=[
                    "pip install -r requirements.txt",
                    "npx cdk synth",
                ],
            ),
        )

        service_stage = ServiceStage(self, "Prod")
        deployment = pipeline.add_stage(service_stage)

        # Run the smoke test after the stage has deployed. add_post attaches
        # the step to this deployment, so it only runs once every stack in the
        # stage is up.
        deployment.add_post(self._smoke_test_step(service_stage))

    def _smoke_test_step(self, stage: ServiceStage) -> pipelines.CodeBuildStep:
        """The post-deployment smoke test.

        Two things make this step work against freshly deployed
        infrastructure:

        1. env_from_cfn_outputs -- the API URL and the role ARN are not known
           until the stage deploys, so they cannot be hardcoded. CDK Pipelines
           reads them out of the deployed stack's outputs and injects them as
           environment variables.
        2. role_policy_statements -- the step's own CodeBuild role is granted
           "sts:AssumeRole", scoped to the IAM path the smoke-test roles are
           created under. The step therefore holds no permission on the API
           itself; it can only get there by assuming the deployed role.
        """
        return pipelines.CodeBuildStep(
            "SmokeTest",
            # The deploy stage produced these values. env_from_cfn_outputs
            # wires each CfnOutput to an environment variable name.
            env_from_cfn_outputs={
                "API_URL": stage.api_url_output,
                "SMOKE_TEST_ROLE_ARN": stage.smoke_test_role_arn_output,
            },
            install_commands=["pip install --upgrade boto3"],
            commands=["python smoke_tests/smoke_test.py"],
            # Least privilege: assume roles under the smoke-test path, nothing
            # else. Narrower than granting the step access to the API directly,
            # because the step cannot call anything until the deployment hands
            # it a role.
            role_policy_statements=[
                iam.PolicyStatement(
                    actions=["sts:AssumeRole"],
                    resources=[
                        self.format_arn(
                            service="iam",
                            region="",
                            resource="role",
                            # Trailing "*" covers the generated role name; the
                            # path keeps it to this example's roles.
                            resource_name=f"{SMOKE_TEST_ROLE_PATH.strip('/')}/*",
                        )
                    ],
                )
            ],
        )
