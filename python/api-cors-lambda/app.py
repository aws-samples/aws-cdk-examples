from constructs import Construct
from aws_cdk import (
    App, Stack,
    aws_lambda as _lambda,
    aws_apigateway as _apigw
)


class ApiCorsLambdaStack(Stack):

    def __init__(self, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        base_lambda = _lambda.Function(self, 'ApiCorsLambda',
                                       handler='lambda-handler.handler',
                                       runtime=_lambda.Runtime.PYTHON_3_7,
                                       code=_lambda.Code.from_asset('lambda'))

        base_api = _apigw.RestApi(self, 'ApiGatewayWithCors',
                                  rest_api_name='ApiGatewayWithCors')

        example_entity = base_api.root.add_resource(
            'example',
            default_cors_preflight_options=_apigw.CorsOptions(
                allow_methods=['GET', 'OPTIONS'],
                allow_origins=_apigw.Cors.ALL_ORIGINS)
        )
        example_entity_lambda_integration = _apigw.LambdaIntegration(
            base_lambda,
            proxy=False,
            integration_responses=[
                _apigw.IntegrationResponse(
                    status_code="200",
                    response_parameters={
                        'method.response.header.Access-Control-Allow-Origin': "'*'"
                    }
                )
            ]
        )
        example_entity.add_method(
            'GET', example_entity_lambda_integration,
            method_responses=[
                _apigw.MethodResponse(
                    status_code="200",
                    response_parameters={
                        'method.response.header.Access-Control-Allow-Origin': True
                    }
                )
            ]
        )


app = App()
ApiCorsLambdaStack(app, "ApiCorsLambdaStack")
app.synth()
