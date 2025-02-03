import cdk_nag
from aws_cdk import (
    aws_apigateway as apigateway,
    aws_iam as iam,
    aws_logs as logs,
    aws_sqs as sqs,
    CfnOutput,
    RemovalPolicy,
    Stack
)
from constructs import Construct


class RestAPI(Construct):
    def __init__(self,
                 scope: Stack,
                 construct_id: str,
                 sms_queue: sqs.Queue,
                 whatsapp_queue: sqs.Queue) -> None:
        super().__init__(scope, construct_id)

        # Create API Gateway
        api_logs = logs.LogGroup(scope=self,
                                 id='ApiGatewayLogs',
                                 retention=logs.RetentionDays.ONE_WEEK,
                                 removal_policy=RemovalPolicy.DESTROY)
        api = apigateway.RestApi(scope=self,
                                 id='ApiGateway',
                                 rest_api_name="Messaging API",
                                 deploy_options=apigateway.StageOptions(
                                     access_log_destination=apigateway.LogGroupLogDestination(api_logs),
                                     access_log_format=apigateway.AccessLogFormat.clf(),
                                     logging_level=apigateway.MethodLoggingLevel.INFO),
                                 default_cors_preflight_options=apigateway.CorsOptions(
                                     allow_origins=['*'],
                                     allow_methods=['POST', 'OPTIONS'],
                                     allow_headers=['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key',
                                                    'X-Amz-Security-Token']
                                 )
                                 )

        # Create API Gateway Role for SQS access
        api_role = iam.Role(scope=self,
                            id='APIGatewayWhatsAppRole',
                            assumed_by=iam.ServicePrincipal("apigateway.amazonaws.com"))
        api_role.add_to_policy(iam.PolicyStatement(actions=['sqs:SendMessage'],
                                                   resources=[sms_queue.queue_arn,
                                                              whatsapp_queue.queue_arn]))

        # Create v1 resource
        v1_resource = api.root.add_resource('v1')
        sms_resource = v1_resource.add_resource("sendSMS")
        whatsapp_resource = v1_resource.add_resource("sendWhatsApp")

        # Create request validator
        validator = api.add_request_validator(id='MessageRequestValidator',
                                              validate_request_body=True,
                                              validate_request_parameters=True)

        # Create model for message requests
        message_model = api.add_model(id="MessageRequestModel",
                                      content_type="application/json",
                                      model_name="MessageRequest",
                                      schema=apigateway.JsonSchema(
                                          type=apigateway.JsonSchemaType.OBJECT,
                                          required=["message_body", "destination_number"],
                                          properties={
                                              "message_body": apigateway.JsonSchema(
                                                  type=apigateway.JsonSchemaType.STRING),
                                              "destination_number": apigateway.JsonSchema(
                                                  type=apigateway.JsonSchemaType.STRING)
                                          }
                                      )
                                      )

        # Add SMS POST method
        sms_integration = apigateway.AwsIntegration(
            service='sqs',
            integration_http_method='POST',
            path=f"{scope.account}/{sms_queue.queue_name}",
            options=apigateway.IntegrationOptions(
                credentials_role=api_role,
                request_templates={
                    "application/json": "Action=SendMessage&MessageBody=$util.urlEncode($input.body)"
                },
                request_parameters={
                    "integration.request.header.Content-Type": "'application/x-www-form-urlencoded'"
                },
                integration_responses=[{
                    "statusCode": "200",
                    "responseTemplates": {
                        "application/json": ""
                    },
                    "responseParameters": {
                        "method.response.header.Access-Control-Allow-Headers": "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
                        "method.response.header.Access-Control-Allow-Methods": "'POST,OPTIONS'",
                        "method.response.header.Access-Control-Allow-Origin": "'*'"
                    }
                }],
                passthrough_behavior=apigateway.PassthroughBehavior.NEVER
            )
        )

        sms_resource.add_method(
            "POST",
            sms_integration,
            api_key_required=True,
            request_validator=validator,
            request_models={"application/json": message_model},
            method_responses=[
                apigateway.MethodResponse(
                    status_code="200",
                    response_parameters={
                        "method.response.header.Access-Control-Allow-Headers": True,
                        "method.response.header.Access-Control-Allow-Methods": True,
                        "method.response.header.Access-Control-Allow-Origin": True
                    }
                )
            ]
        )
        # Add WhatsApp POST method with similar configuration
        whatsapp_integration = apigateway.AwsIntegration(
            service="sqs",
            integration_http_method="POST",
            path=f"{scope.account}/{whatsapp_queue.queue_name}",
            options=apigateway.IntegrationOptions(
                credentials_role=api_role,
                request_templates={
                    "application/json": 'Action=SendMessage&MessageBody=$util.urlEncode($input.body)'
                },
                request_parameters={
                    "integration.request.header.Content-Type": "'application/x-www-form-urlencoded'"
                },
                integration_responses=[{
                    "statusCode": "200",
                    "responseTemplates": {
                        "application/json": ""
                    },
                    "responseParameters": {
                        "method.response.header.Access-Control-Allow-Headers": "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
                        "method.response.header.Access-Control-Allow-Methods": "'POST,OPTIONS'",
                        "method.response.header.Access-Control-Allow-Origin": "'*'"
                    }
                }],
                passthrough_behavior=apigateway.PassthroughBehavior.NEVER
            )
        )

        whatsapp_resource.add_method(
            "POST",
            whatsapp_integration,
            api_key_required=True,
            request_validator=validator,
            request_models={"application/json": message_model},
            method_responses=[
                apigateway.MethodResponse(
                    status_code="200",
                    response_parameters={
                        "method.response.header.Access-Control-Allow-Headers": True,
                        "method.response.header.Access-Control-Allow-Methods": True,
                        "method.response.header.Access-Control-Allow-Origin": True
                    }
                )
            ]
        )

        # Create Usage Plan & API Key
        api_key = api.add_api_key(id='APIKey',
                                  api_key_name='Message API Key V1',
                                  description='CloudFormation API Key V1')
        plan = api.add_usage_plan(id='APIUsagePlan',
                                  name='SMS_WhatsApp_Plan',
                                  description='Send SMS & Whatsapp Messages usage plan',
                                  api_stages=[apigateway.UsagePlanPerApiStage(api=api,
                                                                              stage=api.deployment_stage)])
        plan.add_api_key(api_key)

        # Add outputs
        CfnOutput(self, "SMSApiGateway",
                  description="SMS End Point in API Gateway (POST)",
                  value=f"{api.url}v1/sendSMS")
        CfnOutput(self, "WhatsAppApiGateway",
                  description="WhatsApp End Point in API Gateway (POST)",
                  value=f"{api.url}v1/sendWhatsApp")
        CfnOutput(self, "APIKey",
                  description="API Key for the API Gateway",
                  value=api_key.key_id)

        # Finally, add cdk-nag suppresions for the POST endpoints in the API
        for suppression in ('AwsSolutions-APIG4', 'AwsSolutions-COG4'):
            for path in ('/MessagingRESTAPI/RestAPI/ApiGateway/Default/v1/sendSMS/POST/Resource',
                         '/MessagingRESTAPI/RestAPI/ApiGateway/Default/v1/sendWhatsApp/POST/Resource'):
                cdk_nag.NagSuppressions.add_resource_suppressions_by_path(stack=scope,
                                                                          path=path,
                                                                          suppressions=[
                                                                              {
                                                                                  "id": suppression,
                                                                                  "reason": 'API authorization is used '
                                                                                            'for this backend method '
                                                                                            'where we do not leverage '
                                                                                            'the concept of users',
                                                                              }
                                                                          ])
