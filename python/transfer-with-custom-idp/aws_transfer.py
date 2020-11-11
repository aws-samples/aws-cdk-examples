from aws_cdk import (core,
                    aws_transfer as transfer,
                    aws_lambda as lambda_,
                    aws_apigateway as apigateway,
                    aws_iam as iam,
                    aws_secretsmanager as secrets,
                    aws_s3 as s3)

import json

class CustomIdpStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # Lambda function to handle the authentication
        handler = lambda_.Function(
            self, 
            "IdpHandler",
            runtime=lambda_.Runtime.PYTHON_3_8,
            code=lambda_.Code.from_asset("resources/lambda"),
            handler="index.lambda_handler",
            environment=dict(
                    SecretsManagerRegion="eu-west-1"
                )
            )

        # Role for the function to access secrets
        handler.role.add_to_principal_policy(
            iam.PolicyStatement(
                actions=["secretsmanager:GetSecretValue"],
                effect=iam.Effect.ALLOW,
                resources=[
                    "arn:aws:secretsmanager:{region}:{account_id}:secret:SFTP/*".format(
                        account_id=self.account,
                        region=self.region
                    )
                ]
            )
        )

        # REST Api to provide endpoint for authentication
        self.base_api = apigateway.RestApi(
            self, 
            "IdpAPI",
            rest_api_name='IdP Service',
            description="This API provides an IDP for AWS Transfer service",
            endpoint_types=[apigateway.EndpointType.REGIONAL])

        # build the API resource paths
        config_entity = self.base_api.root.add_resource('servers').add_resource("{serverId}").add_resource("users").add_resource("{username}").add_resource("config")

        # create a non-proxy Lambda integration
        integration = apigateway.LambdaIntegration(
            handler,
            integration_responses=[
                apigateway.IntegrationResponse(status_code="200")
            ],
            proxy=False,
            request_templates={
                "application/json": """{
  "username": "$input.params('username')",
  "password": "$util.escapeJavaScript($input.params('Password')).replaceAll("\\'","'")",
  "serverId": "$input.params('serverId')"
}"""
            })

        # Response model for integration response
        model = apigateway.Model(
            self, 
            "SftpIdpSecretsModel",
            rest_api=self.base_api,
            content_type="application/json",
            description="API response for GetUserConfig",
            model_name="UserConfigResponseModel",
            schema=apigateway.JsonSchema(
                schema=apigateway.JsonSchemaVersion.DRAFT4,
                title="UserConfig",
                type=apigateway.JsonSchemaType.OBJECT,
                properties={
                    "HomeDirectory": apigateway.JsonSchema(
                        type=apigateway.JsonSchemaType.STRING
                    ),
                    "Role": apigateway.JsonSchema(
                        type=apigateway.JsonSchemaType.STRING,
                    ),
                    "Policy": apigateway.JsonSchema(
                        type=apigateway.JsonSchemaType.STRING
                    ),
                    "PublicKeys": apigateway.JsonSchema(
                        type=apigateway.JsonSchemaType.ARRAY,
                        items=apigateway.JsonSchema(
                            type=apigateway.JsonSchemaType.STRING
                        )
                    )
                }
            )
        )

        # Method response for status 200 using model
        response = apigateway.MethodResponse(
            status_code="200",
            response_models={
                "application/json": model
            }
        )

        # Define GET method on config resource
        config_entity.add_method(
            "GET",
            integration,
            authorization_type=apigateway.AuthorizationType.IAM,
            request_parameters= {
                "method.request.header.Password": False
            },
            method_responses=[
                response
            ]
        )

class SecretsStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, bucket_name=None, role_arn=None, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # an example secret for authentication to transfer-for-sftp.
        # In the real world secrets management would be handled separately to the infrastructure.
        secret = secrets.CfnSecret(
            self,
            "tester",
            name="SFTP/tester",
            secret_string=json.dumps(
                {
                    "HomeDirectoryDetails": "[{\"Entry\": \"/\", \"Target\": \"/%s/${Transfer:UserName}\"}]" % bucket_name,
                    "Password": "tester159",
                    "Role": "%s" % role_arn,
                    "UserId": "tester"
                }
            )
        )

class TransferStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, base_api: apigateway.RestApi, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # IAM role for the transfer service to call IdP API
        idp_role = iam.Role(
            self,
            "RoleForIdp",
            inline_policies={
                "transfer_policy": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            actions=["execute-api:Invoke"],
                            effect=iam.Effect.ALLOW,
                            resources=[
                                "arn:aws:execute-api:{region}:{account_id}:{rest_api_id}/prod/GET/*".format(
                                    account_id=self.account,
                                    region=self.region,
                                    rest_api_id=base_api.rest_api_id
                                )
                            ]
                        ),
                        iam.PolicyStatement(
                            actions=["apigateway:GET"],
                            effect=iam.Effect.ALLOW,
                            resources=[
                                "*"
                            ]
                        )
                    ]
                )
            },
            assumed_by=iam.ServicePrincipal("transfer.amazonaws.com")
        )

        # Logging role for the transfer service
        idp_logging_role = iam.Role(
            self,
            "RoleForIdpLogging",
            inline_policies={
                "logging_policy": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            actions=["logs:*"],
                            effect=iam.Effect.ALLOW,
                            resources=[
                                "*"
                            ]
                        )
                    ]
                )
            },
            assumed_by=iam.ServicePrincipal("transfer.amazonaws.com")
        )

        # Create a transfer-for-sftp server
        t = transfer.CfnServer(
            self, 
            "TransferServer",
            identity_provider_type="API_GATEWAY",
            identity_provider_details=transfer.CfnServer.IdentityProviderDetailsProperty(
                url=base_api.url_for_path(),
                invocation_role=idp_role.role_arn
            ),
            logging_role=idp_logging_role.role_arn
        )

        # The S3 bucket for file storage
        self.bucket = s3.Bucket(
            self,
            "sftp_storage",
        )

        # Define the IAM role for the transfer-for-sftp service
        # to access the file storage bucket
        self.transfer_user_iam_role = iam.Role(
            self,
            "RoleForTransferUser",
            inline_policies={
                "logging_policy": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            actions=["s3:*"],
                            effect=iam.Effect.ALLOW,
                            resources=[
                                self.bucket.bucket_arn,
                                "%s/*" % self.bucket.bucket_arn
                            ]
                        )
                    ]
                )
            },
            assumed_by=iam.ServicePrincipal("transfer.amazonaws.com")
        )









