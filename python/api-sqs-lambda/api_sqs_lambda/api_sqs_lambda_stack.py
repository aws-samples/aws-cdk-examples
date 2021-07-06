from aws_cdk import (
    aws_sqs as sqs,
    aws_iam as iam,
    aws_apigateway as apigw,
    aws_lambda as _lambda,
    aws_lambda_event_sources as lambda_event_source,
    core
)

class ApiSqsLambdaStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        #Create the SQS queue
        queue = sqs.Queue(self, "SQSQueue")

        #Create the API GW service role with permissions to call SQS
        rest_api_role = iam.Role(
            self,
            "RestAPIRole",
            assumed_by=iam.ServicePrincipal("apigateway.amazonaws.com"),
            managed_policies=[iam.ManagedPolicy.from_aws_managed_policy_name("AmazonSQSFullAccess")]
        )

        #Create an API GW Rest API
        base_api = apigw.RestApi(self, 'ApiGW',rest_api_name='TestAPI')
        base_api.root.add_method("ANY")

        #Create a resource named "example" on the base API
        api_resource = base_api.root.add_resource('example')


        #Create API Integration Response object: https://docs.aws.amazon.com/cdk/api/latest/python/aws_cdk.aws_apigateway/IntegrationResponse.html
        integration_response = apigw.IntegrationResponse(
            status_code="200",
            response_templates={"application/json": ""},

        )

        #Create API Integration Options object: https://docs.aws.amazon.com/cdk/api/latest/python/aws_cdk.aws_apigateway/IntegrationOptions.html
        api_integration_options = apigw.IntegrationOptions(
            credentials_role=rest_api_role,
            integration_responses=[integration_response],
            request_templates={"application/json": "Action=SendMessage&MessageBody=$input.body"},
            passthrough_behavior=apigw.PassthroughBehavior.NEVER,
            request_parameters={"integration.request.header.Content-Type": "'application/x-www-form-urlencoded'"},
        )

        #Create AWS Integration Object for SQS: https://docs.aws.amazon.com/cdk/api/latest/python/aws_cdk.aws_apigateway/AwsIntegration.html
        api_resource_sqs_integration = apigw.AwsIntegration(
            service="sqs",
            integration_http_method="POST",
            path="{}/{}".format(core.Aws.ACCOUNT_ID, queue.queue_name),
            options=api_integration_options
        )

        #Create a Method Response Object: https://docs.aws.amazon.com/cdk/api/latest/python/aws_cdk.aws_apigateway/MethodResponse.html
        method_response = apigw.MethodResponse(status_code="200")

        #Add the API GW Integration to the "example" API GW Resource
        api_resource.add_method(
            "POST",
            api_resource_sqs_integration,
            method_responses=[method_response]
        )

        #Creating Lambda function that will be triggered by the SQS Queue
        sqs_lambda = _lambda.Function(self,'SQSTriggerLambda',
            handler='lambda-handler.handler',
            runtime=_lambda.Runtime.PYTHON_3_7,
            code=_lambda.Code.asset('lambda'),
        )

        #Create an SQS event source for Lambda
        sqs_event_source = lambda_event_source.SqsEventSource(queue)

        #Add SQS event source to the Lambda function
        sqs_lambda.add_event_source(sqs_event_source)