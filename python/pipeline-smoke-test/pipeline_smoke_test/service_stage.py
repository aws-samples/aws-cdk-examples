from aws_cdk import Stage
from constructs import Construct

from pipeline_smoke_test.service_stack import ServiceStack


class ServiceStage(Stage):
    """One deployable copy of the application.

    A Stage is what a CDK Pipeline deploys as a unit. This one holds a single
    stack, and re-exposes that stack's two CfnOutputs so the pipeline's
    smoke-test step can read them. A step cannot reach into a stack directly --
    it needs the CfnOutput object, which is what "env_from_cfn_outputs" turns
    into an environment variable at run time.
    """

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        self.service = ServiceStack(self, "Service")

        self.api_url_output = self.service.api_url_output
        self.smoke_test_role_arn_output = self.service.smoke_test_role_arn_output
