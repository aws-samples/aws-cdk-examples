from aws_cdk import (
    NestedStack,
    aws_cognito as cognito,
)
from constructs import Construct


class Cognito(NestedStack):
    def __init__(
        self,
        scope: Construct,
        id: str,
    ) -> None:
        super().__init__(scope, id)

        self.user_pool = cognito.UserPool(
            self,
            "UserPool",
            feature_plan=cognito.FeaturePlan.LITE,
        )

        cognito.UserPoolGroup(
            self,
            "UserPoolGroupAdmin",
            user_pool=self.user_pool,
            description="Admin Group",
            group_name="admin",
            precedence=1,
        )

        cognito.UserPoolGroup(
            self,
            "UserPoolGroupUser",
            user_pool=self.user_pool,
            description="User Group",
            group_name="user",
            precedence=2,
        )

        self.user_pool_client = cognito.UserPoolClient(
            self,
            "UserPoolClient",
            user_pool=self.user_pool,
            auth_flows=cognito.AuthFlow(user_srp=True),
        )
