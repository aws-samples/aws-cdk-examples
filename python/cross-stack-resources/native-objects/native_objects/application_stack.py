from aws_cdk import (
    aws_lambda as lambda_,
    aws_apigateway as apigw,
    Stack
)
from constructs import Construct

class ApplicationStack(Stack):

    def __init__(self, scope: Construct, id: str, referenced_function: lambda_.IFunction, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        my_api = apigw.LambdaRestApi(self, "myRestAPI", handler=referenced_function)

