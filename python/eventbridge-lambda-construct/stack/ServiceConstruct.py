from constructs import Construct
from aws_cdk import (
    aws_events as events,
    aws_lambda as _lambda,
    aws_events_targets as targets,
    aws_lambda_destinations as lambda_event_destinations,
    aws_sqs as sqs,
    Duration, CfnOutput
)

class ServiceConstruct(Construct):
    def __init__(self, scope: Construct, id: str, *, timestamp, on_success, source_bus, **kwargs):
        super().__init__(scope, id)

        # Note that in a construct, IDs will automatically be appended by with the id of the construct.
        # Dead letter queue first
        dlq = sqs.Queue(self,
            id="_DLQ",
            retention_period=Duration.days(3)
        )

        dlq_sqs_destination = lambda_event_destinations.SqsDestination(dlq)

        # Create the lambda function
        service_lambda = _lambda.Function(self,
            #Name of the function 
            id="_lambda",
            #This is critical to force generation of a new version of the function
            description=timestamp,
            #Choose the runtime
            runtime=_lambda.Runtime.FROM_IMAGE,
            #File and function of the handler
            handler=_lambda.Handler.FROM_IMAGE,
            #Code location
            code=_lambda.Code.from_asset_image("lambda/" + id),
            #Increase the timeout from default 5s
            timeout=Duration.seconds(30),
            #Enable x-ray tracing
            tracing=_lambda.Tracing.ACTIVE,
            #Increase memory from default 128MB
            memory_size=512,
        )
        
        version = service_lambda.current_version

        service_lambda_alias = _lambda.Alias(self,
            id="_lambda_alias",
            alias_name="service_at_" + timestamp,
            version=version,
            description="Lastest version of " + id,
            on_success=on_success,
            on_failure=dlq_sqs_destination,
            provisioned_concurrent_executions=3,
        )
        # Target the lambda from EventBridge with a rule
        lambda_service_rule = events.Rule(self,
            id="_source_rule",
            description="A source rule for " + id,
            event_bus=source_bus,
            event_pattern=events.EventPattern(
                source=[id]
            )
        )
        # Point the rule to Lambda
        lambda_service_rule.add_target(
            targets.LambdaFunction(
                service_lambda_alias,
                dead_letter_queue=dlq,
                max_event_age=Duration.minutes(1), 
                retry_attempts=0,
            )
        )
        CfnOutput(self, id="Deployed service: ", value=id)
    