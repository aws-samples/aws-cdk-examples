from aws_cdk import (
    Stack,
    aws_lambda as _lambda,
)
from constructs import Construct

from .apigw.main import API
from .cognito.main import Cognito
from .verified_permissions.main import VerifiedPermissionsNested


class Backend(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Create Cognito User Pool
        cognito = Cognito(self, "Cognito")

        # Create Verified Permissions Policy Store
        verified_permissions = VerifiedPermissionsNested(
            self,
            "VerifiedPermissions",
            user_pool=cognito.user_pool,
        )

        # Create Authorizer Lambda function
        authorizer = _lambda.Function(
            self,
            "AuthorizerFunction",
            runtime=_lambda.Runtime.NODEJS_20_X,
            code=_lambda.Code.from_asset("stack/lambdas/authorizer"),
            handler="main.handler",
            environment={
                "POLICY_STORE_ID": verified_permissions.policy_store_id,
                "NAMESPACE": "amazonverified",
                "TOKEN_TYPE": "accessToken",
            },
        )
        # Create Lambda functions
        admin_lambda = _lambda.Function(
            self,
            "AdminFunction",
            runtime=_lambda.Runtime.PYTHON_3_13,
            code=_lambda.Code.from_asset("stack/lambdas/admin"),
            handler="main.handler",
        )

        user_lambda = _lambda.Function(
            self,
            "UserFunction",
            runtime=_lambda.Runtime.PYTHON_3_13,
            code=_lambda.Code.from_asset("stack/lambdas/user"),
            handler="main.handler",
        )


        # Create REST API
        API(
            self,
            "API",
            authorizer=authorizer,
            admin_lambda=admin_lambda,
            user_lambda=user_lambda,
        )

