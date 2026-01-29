from aws_cdk import (
    Duration,
    aws_apigateway as apigateway,
)


def create_authorizer(construct, handler):
    authorizer = apigateway.RequestAuthorizer(
        construct,
        "ApiGatewayAuthorizer",
        handler=handler,
        authorizer_name="AmazonVerifiedPermissions",
        identity_sources=[
            apigateway.IdentitySource.header("Authorization"),
            apigateway.IdentitySource.context("httpMethod"),
            apigateway.IdentitySource.context("path"),
        ],
        results_cache_ttl=Duration.seconds(120),
    )

    return authorizer
