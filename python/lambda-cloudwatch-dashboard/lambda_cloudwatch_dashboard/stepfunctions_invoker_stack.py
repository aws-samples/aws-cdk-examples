from aws_cdk import (
    Duration,
    Fn,
    Stack,
)
from aws_cdk import (
    aws_lambda as _lambda,
)
from aws_cdk import (
    aws_stepfunctions as sfn,
)
from aws_cdk import (
    aws_stepfunctions_tasks as sfn_tasks,
)
from aws_cdk import (
    custom_resources as cr,
)
from constructs import Construct


class StepfunctionsInvokerStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        lambda_arn = Fn.import_value("CloudwatchDashboardLambdaARN")
        target_lambda = _lambda.Function.from_function_arn(
            self, "ImportedTargetFunction", function_arn=lambda_arn
        )
        generate_array = sfn.Pass(
            self, "GenerateArray", result=sfn.Result.from_array(list(range(1, 41)))
        )

        invoke_target_lambda_task = sfn_tasks.LambdaInvoke(
            self,
            "InvokeTargetLambda",
            lambda_function=target_lambda,
            retry_on_service_exceptions=False,
        ).add_retry(
            errors=[
                "Lambda.ClientExecutionTimeoutException",
                "Lambda.ServiceException",
                "Lambda.AWSLambdaException",
                "Lambda.SdkClientException",
                "ValueError",
            ],
            interval=Duration.seconds(5),
            max_attempts=5,
            backoff_rate=2.0,
        )

        wait_task = sfn.Wait(
            self, "WaitAfterLambda", time=sfn.WaitTime.duration(Duration.seconds(120))
        )
        lambda_invoker_map = sfn.Map(
            self,
            "LambdaInvoker40PerMinute",
            items_path=sfn.JsonPath.string_at("$"),
            item_selector={
                "iteration_index": sfn.JsonPath.string_at("$$.Map.Item.Index"),
                "item_value": sfn.JsonPath.string_at("$$.Map.Item.Value"),
            },
            max_concurrency=4,
        )
        # lambda_invoker_map.item_processor(invoke_target_lambda_task)
        lambda_invoker_map.item_processor(invoke_target_lambda_task.next(wait_task))

        definition = sfn.DefinitionBody.from_chainable(
            generate_array.next(lambda_invoker_map)
        )
        state_machine = sfn.StateMachine(
            self,
            "LambdaInvokerStateMachine",
            comment="Lambda Invoker - Call Lambda 40 times",
            definition_body=definition,
        )
        target_lambda.grant_invoke(state_machine.role)

        # Custom resource to start Step Functions execution
        start_execution = cr.AwsCustomResource(
            self,
            "StartStepFunctionsExecution",
            on_create=cr.AwsSdkCall(
                service="StepFunctions",
                action="startExecution",
                parameters={
                    "stateMachineArn": state_machine.state_machine_arn,
                    "input": "{}",
                },
                physical_resource_id=cr.PhysicalResourceId.from_response(
                    "executionArn"
                ),
            ),
            policy=cr.AwsCustomResourcePolicy.from_sdk_calls(
                resources=[state_machine.state_machine_arn]
            ),
        )

        # Ensure the custom resource runs after the state machine is created
        start_execution.node.add_dependency(state_machine)
