from aws_cdk import (
    aws_lambda as lambda_,
    aws_apigateway as apigw,
    aws_dynamodb as ddb,
    aws_iam as iam,
    core,
)

# We should find a better place to store these. These are the the request/response mapping templates for API Gateway.
request_string = """{{"TableName": "{}","Key": {{"short_code": {{"S": "$input.params('short')"}}}}}}"""
response_string = """
#set($inputRoot = $input.path('$'))
#set($item = $inputRoot.Item)
#set($context.responseOverride.status = 307)
#set($context.responseOverride.header.Location = "$item.url.S")
"""


class ShortenerConstruct(core.Construct):

    def __init__(self, scope: core.Construct, id: str) -> None:
        super().__init__(scope, id)

        # We create a table to hold the mapping from shortcode to url
        table = ddb.Table(
            self,
            "ShortLinkMapTable",
            partition_key=ddb.Attribute(name="short_code", type=ddb.AttributeType.STRING)
        )

        # We create a function that will generate the random string to use for the short code. We coudl do this directly
        # in APIGW by leveraging the requestId, but I wanted to show a few more features of CDK.
        lambda_fn = lambda_.Function(
            self, "Singleton",
            code=lambda_.AssetCode(path="./shortener/lambdaCode/"),
            handler="create-link-handler.main",
            timeout=core.Duration.seconds(30),
            runtime=lambda_.Runtime.PYTHON_3_7,
            environment={
                "TABLE_NAME": table.table_name
            }
        )

        # Give the Lambda Function permission to Read/Write the Table, Should probably be scoped better
        table.grant_full_access(grantee=lambda_fn)

        # Create a REST API
        rest_api: apigw.RestApi = apigw.RestApi(
            self,
            "MyRestAPI",
            rest_api_name="MyCDKAPI",
            description="This service serves Lambdas")

        # Grant permission for APIGW to invoke Lambda
        integration: apigw.LambdaIntegration = apigw.LambdaIntegration(handler=lambda_fn)

        # We create a Role that API Gateway can assume that has full access to DynamoDB (DON'T DO THIS IN PRODUCTION)
        rest_api_role: iam.Role = iam.Role(
            self,
            "RestAPIRole",
            assumed_by=iam.ServicePrincipal("apigateway.amazonaws.com"),
            managed_policies=[iam.ManagedPolicy().from_aws_managed_policy_name("AmazonDynamoDBFullAccess")]
        )

        # We create an APIGW Integration with DynamoDB
        ddb_integration = apigw.AwsIntegration(
            service='dynamodb',
            action="GetItem",
            integration_http_method="POST",
            options=apigw.IntegrationOptions(
                request_templates={
                    "application/json": request_string.format(table.table_name)
                },
                integration_responses=[apigw.IntegrationResponse(
                    status_code="200",
                    response_templates={'application/json': response_string}
                )],
                credentials_role=rest_api_role
            )
        )

        # Add the GET method to the root of the API, attach the Lambda Integration to the HTTP Method.
        rest_api.root.add_method("POST", integration)
        short_resource = rest_api.root.add_resource(path_part='{short}')
        short_resource.add_method("GET", ddb_integration, method_responses=[apigw.MethodResponse(status_code="200")])

