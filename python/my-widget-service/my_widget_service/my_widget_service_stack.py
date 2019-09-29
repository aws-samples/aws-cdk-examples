from aws_cdk import (
    core,
    aws_apigateway as apigw,
    aws_s3 as s3,
    aws_iam as iam
)


class MyWidgetServiceStack(core.Stack):

    def __init__(self, app: core.App, id: str, **kwargs) -> None:
        super().__init__(app, id)

        bucket: s3.Bucket = s3.Bucket(self, "WidgetStore")

        api: apigw.RestApi = apigw.RestApi(
            self,
            "widgets-api",
            rest_api_name="Widget Service",
            description="This service serves widgets."
        )

        rest_api_role: iam.Role = iam.Role(
            self,
            "RestAPIRole",
            assumed_by=iam.ServicePrincipal("apigateway.amazonaws.com"),
            managed_policies=[iam.ManagedPolicy.from_aws_managed_policy_name("AmazonS3FullAccess")]
        )

        list_objects_response: apigw.IntegrationResponse = apigw.IntegrationResponse(status_code="200")

        list_objects_integration_options: apigw.IntegrationOptions = apigw.IntegrationOptions(
            credentials_role=rest_api_role,
            integration_responses=[list_objects_response],
        )

        get_widget_integration_options: apigw.IntegrationOptions = apigw.IntegrationOptions(
            credentials_role=rest_api_role,
            integration_responses=[list_objects_response],
            request_templates={"application/json": "#set($context.requestOverride.path.object = $input.params('id'))"}
        )

        put_widget_integration_options: apigw.IntegrationOptions = apigw.IntegrationOptions(
            credentials_role=rest_api_role,
            integration_responses=[list_objects_response],
            passthrough_behavior=apigw.PassthroughBehavior.NEVER,
            request_parameters={"integration.request.path.object": "method.request.path.id"},
            request_templates={
                "application/json": "#set($now=$context.requestTimeEpoch)\n"
                                    "#set($body=\"$input.params('id') created $now\")"
                                    "\n$util.base64Encode($body)"}
        )

        get_widgets_integration: apigw.AwsIntegration = apigw.AwsIntegration(
            service="s3",
            integration_http_method="GET",
            path=bucket.bucket_name,
            options=list_objects_integration_options
        )

        get_widget_integration: apigw.AwsIntegration = apigw.AwsIntegration(
            service="s3",
            integration_http_method="GET",
            path="{}/{{object}}".format(bucket.bucket_name),
            options=get_widget_integration_options
        )

        put_widget_integration: apigw.AwsIntegration = apigw.AwsIntegration(
            service="s3",
            integration_http_method="PUT",
            path="{}/{{object}}".format(bucket.bucket_name),
            options=put_widget_integration_options
        )

        delete_widget_integration: apigw.AwsIntegration = apigw.AwsIntegration(
            service="s3",
            integration_http_method="DELETE",
            path="{}/{{object}}".format(bucket.bucket_name),
            options=get_widget_integration_options
        )

        method_response: apigw.MethodResponse = apigw.MethodResponse(status_code="200")

        api.root.add_method(
            "GET",
            get_widgets_integration,
            method_responses=[method_response]
        )

        widget = api.root.add_resource('{id}')
        widget.add_method(
            "GET",
            get_widget_integration,
            method_responses=[method_response]
        )

        widget.add_method(
            "POST",
            put_widget_integration,
            method_responses=[method_response],
            request_parameters={"method.request.path.id": True}
        )

        widget.add_method(
            "DELETE",
            delete_widget_integration,
            method_responses=[method_response]
        )


