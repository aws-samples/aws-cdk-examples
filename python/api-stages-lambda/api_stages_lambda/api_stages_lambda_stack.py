from aws_cdk import (
    Stack,
    aws_apigateway as apigw,
    aws_lambda as _lambda,
    aws_iam as iam,
    Aws, CfnOutput
)
from constructs import Construct

class ApiStagesLambdaStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Define AWS Lambda function and aliases
        function = _lambda.Function(self, "LambdaFunction",
            runtime=_lambda.Runtime.PYTHON_3_8,
            handler="lambda-handler.handler",
            code=_lambda.Code.from_asset("lambda")
        )
        version = function.current_version

        # Define the REST API
        api = apigw.RestApi(self, "DeploymentStagesAPI",
            rest_api_name="MultiStageApi",
            deploy=False
        )

        # Define GET method for /stage_info
        stage_info_resource = api.root.add_resource("stage_info")
        stage_info_get_method = stage_info_resource.add_method("GET",
            authorization_type=apigw.AuthorizationType.IAM,
            integration=apigw.AwsIntegration(
                service="lambda",
                region=Aws.REGION,
                proxy=True,
                path=f"2015-03-31/functions/{function.function_arn}:${{stageVariables.lambdaAlias}}/invocations"
            )
        )

        # Define Prod specific resources
        prod_alias = _lambda.Alias(self, "ProdAlias",
            alias_name="prod",
            version=version
        )

        prod_deployment = apigw.Deployment(self, "ProdApiDeployment", api=api)    
        prod_stage = apigw.Stage(self, "ProdApiStage",
            deployment=prod_deployment,
            stage_name="prod",
            variables={
                "lambdaAlias": prod_alias.alias_name
            }
        )

        # NOTE: We use this method of permissioning to further restrict 
        # which API Gateway stage can invoke a specific Lambda Alias.
        # This approach is more restrictive than using prod_alias.grant_invoke(api)
        # which would give permission to the API Gateway service or a specific
        # IAM role that APIGW can assume to invoke the Lambda Alias
        prod_alias.add_permission("ProdStageInvokeProdAliasPermission",
            principal=iam.ServicePrincipal("apigateway.amazonaws.com"),
            action="lambda:InvokeFunction",
            source_arn=api.arn_for_execute_api(
                method=stage_info_get_method.http_method,
                path=stage_info_resource.path,
                stage=prod_stage.stage_name
            )
        )

        # Define Dev specific resources
        dev_alias = _lambda.Alias(self, "DevAlias",
            alias_name="dev",
            version=version
        )

        dev_deployment = apigw.Deployment(self, "DevApiDeployment", api=api)    
        dev_stage = apigw.Stage(self, "DevApiStage",
            deployment=dev_deployment,
            stage_name="dev",
            variables={
                "lambdaAlias": dev_alias.alias_name
            }
        )

        dev_alias.add_permission("DevStageInvokeDevAliasPermission",
            principal=iam.ServicePrincipal("apigateway.amazonaws.com"),
            action="lambda:InvokeFunction",
            source_arn=api.arn_for_execute_api(
                method=stage_info_get_method.http_method,
                path=stage_info_resource.path,
                stage=dev_stage.stage_name
            )
        )

        # Define Test specific resources
        test_alias = _lambda.Alias(self, "TestAlias",
            alias_name="test",
            version=version
        )

        test_deployment = apigw.Deployment(self, "TestApiDeployment", api=api)    
        test_stage = apigw.Stage(self, "TestApiStage",
            deployment=test_deployment,
            stage_name="test",
            variables={
                "lambdaAlias": test_alias.alias_name
            }
        )

        test_alias.add_permission("TestStageInvokeTestAliasPermission",
            principal=iam.ServicePrincipal("apigateway.amazonaws.com"),
            action="lambda:InvokeFunction",
            source_arn=api.arn_for_execute_api(
                method=stage_info_get_method.http_method,
                path=stage_info_resource.path,
                stage=test_stage.stage_name
            )
        )

        # Define outputs
        CfnOutput(self, "ApiHostUrl", 
            value=f"{api.rest_api_id}.execute-api.{Aws.REGION}.amazonaws.com",
            description="API Host URL"
        )