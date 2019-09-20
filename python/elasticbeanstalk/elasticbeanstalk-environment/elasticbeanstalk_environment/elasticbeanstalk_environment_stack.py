from aws_cdk import core
from aws_cdk.aws_elasticbeanstalk import (
    CfnApplication,
    CfnEnvironment
)


class ElasticbeanstalkEnvironmentStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        node = self.node

        app_name = 'MyApp'

        platform = node.try_get_context("platform")

        app = CfnApplication(
            self, 'Application',
            application_name=app_name
        )

        CfnEnvironment(
            self, 'Environment',
            environment_name='MySampleEnvironment',
            application_name=app.application_name or app_name,
            platform_arn=platform
        )
