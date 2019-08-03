from aws_cdk import (
    aws_lambda as lambda_,
    aws_apigateway as apigw,
    core
)


class LambdaStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # We are going to load the python code from a local file and then use it as an inline code definition
        with open("./lambda_integration/lambda-handler.py", encoding="utf8") as fp:
            handler_code = fp.read()

        lambda_fn = lambda_.Function(
            self, "Singleton",
            code=lambda_.InlineCode(handler_code),
            handler="index.main",
            timeout=core.Duration.seconds(300),
            runtime=lambda_.Runtime.PYTHON_3_7,
        )

        # Create a REST API
        rest_api: apigw.RestApi = apigw.RestApi(
            self,
            "MyRestAPI",
            rest_api_name="MyCDKAPI",
            description="This service serves Lambdas")

        # Grant permission for APIGW to invoke Lambda
        integration: apigw.LambdaIntegration = apigw.LambdaIntegration(handler=lambda_fn)

        # Add the GET method to the root of the API, attach the Lambda Integration to the HTTP Method.
        rest_api.root.add_method("GET", integration)
