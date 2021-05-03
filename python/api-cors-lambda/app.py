from aws_cdk import (
    core,
    aws_lambda as _lambda,
    aws_apigateway as _apigw
)


class ApiCorsLambdaStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        base_lambda = _lambda.Function(self, 'ApiCorsLambda',
                                       handler='lambda-handler.handler',
                                       runtime=_lambda.Runtime.PYTHON_3_7,
                                       code=_lambda.Code.asset('lambda'))

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
            integration_responses=[{
                'statusCode': '200',
                'responseParameters': {
                    'method.response.header.Access-Control-Allow-Origin': "'*'",
                }
            }]
        )
        example_entity.add_method(
            'GET', example_entity_lambda_integration,
            method_responses=[{
                'statusCode': '200',
                'responseParameters': {
                    'method.response.header.Access-Control-Allow-Origin': True,
                }
            }]
        )


app = core.App()
ApiCorsLambdaStack(app, "ApiCorsLambdaStack")
app.synth()
