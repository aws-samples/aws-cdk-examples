from constructs import Construct
from aws_cdk import (
    NestedStack,
    aws_apigateway as apigw,
)

from .authorizer import create_authorizer
from .integration import lambda_integration


class API(NestedStack):

    def __init__(
        self, scope: Construct, id: str, authorizer, admin_lambda, user_lambda
    ) -> None:
        super().__init__(scope, id)

        # Create the REST API
        self.api = apigw.RestApi(
            self,
            "REST",
            endpoint_types=[apigw.EndpointType.REGIONAL],
        )

        # Create authorizer
        authorizer = create_authorizer(self, authorizer)

        # Create API resources and methods
        admin_resource = self.api.root.add_resource("admin")
        admin_resource.add_method(
            "GET",
            lambda_integration(admin_lambda),
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.CUSTOM,
        )

        user_resource = self.api.root.add_resource("user")
        user_resource.add_method(
            "GET",
            lambda_integration(user_lambda),
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.CUSTOM,
        )
