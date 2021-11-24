from aws_cdk import (
    aws_lambda as lambda_,
    aws_apigateway as apigw,
    core
)

class ApplicationStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, lambda_arn: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)
        
        referenced_function = lambda_.Function.from_function_arn(self, id="LocalNameForFunction", function_arn=lambda_arn)
        my_api = apigw.LambdaRestApi(self, "myRestAPI", handler=referenced_function)

