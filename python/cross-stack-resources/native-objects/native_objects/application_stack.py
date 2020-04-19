from aws_cdk import (
    aws_lambda as lambda_,
    aws_apigateway as apigw,
    core
)

class ApplicationStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, referenced_function: lambda_.IFunction, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)
        
        my_api = apigw.LambdaRestApi(self, "myRestAPI", handler=referenced_function)

