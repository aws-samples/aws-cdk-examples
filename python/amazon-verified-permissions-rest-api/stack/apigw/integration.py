from aws_cdk import aws_apigateway as apigw


def lambda_integration(function):
    integration = apigw.LambdaIntegration(
        handler=function,
    )

    return integration
