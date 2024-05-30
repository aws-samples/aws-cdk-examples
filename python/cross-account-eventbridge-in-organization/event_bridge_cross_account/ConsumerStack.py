# pylint: disable=invalid-name
"""Defines the ConsumerStack class"""

from constructs import Construct
from aws_cdk import (
    Stack,
    Duration,
    aws_events as events,
    aws_events_targets as event_targets,
    aws_sqs as sqs,
    aws_lambda as _lambda,
    Aspects,
)
from cdk_nag import AwsSolutionsChecks, NagSuppressions, NagPackSuppression


class ConsumerStack(Stack):
    """
    Defines a CloudFormation Stack consisting of an EventBus, EventBus Policy,
    and a Lambda Function for consuming test events from the EventBus.
    """

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        self.id = "Consumer"
        self.event_bus_name = self.node.try_get_context("event_bus_name")

        self.event_bus = events.EventBus(
            self,
            self.id + "EB" + self.event_bus_name,
            event_bus_name=self.event_bus_name,
        )

        self.event_bus_policy = events.CfnEventBusPolicy(
            self,
            self.id + "EBPolicy",
            statement_id="AllowOrgToPutEvents",
            action="events:PutEvents",
            condition=events.CfnEventBusPolicy.ConditionProperty(
                type="StringEquals",
                key="aws:PrincipalOrgID",
                value=self.node.try_get_context("organization_id"),
            ),
            event_bus_name=self.event_bus.event_bus_name,
            principal="*",
        )

        self.deploy_consumer(self.event_bus)

        # Adds CDK Nag check to stack resources
        Aspects.of(self).add(AwsSolutionsChecks())

    def deploy_consumer(self, event_bus: events.EventBus) -> None:
        """
        Creates a Lambda function to consume test events on the provided
        EventBus. Includes a Dead Letter Queue (DLQ) to handle up to 3
        failed function invocations.

        Args:
            * event_bus (events.EventBus): The EventBridge bus to consume test
                events

        """
        lambda_function = _lambda.Function(
            self,
            "ConsumerLambda",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="consumer.handler",
            timeout=Duration.seconds(30),
            code=_lambda.Code.from_asset("./lambda/consumer"),
            environment={
                "LOG_LEVEL": "DEBUG",
            },
        )

        # This check ensures the usage of the role is not an optional (mypy)
        if lambda_function.role is None:
            raise ValueError("No Lambda function role was created")

        NagSuppressions.add_resource_suppressions(
            construct=lambda_function.role,
            suppressions=[
                NagPackSuppression(
                    id="AwsSolutions-IAM4",
                    reason="The default function role is an AWS managed role",
                )
            ],
        )

        rule = events.Rule(
            self,
            self.id + "ConsumerRule",
            event_bus=event_bus,
            event_pattern=events.EventPattern(
                source=["Producer"],
            ),
        )

        dlq = sqs.Queue(
            self,
            self.id + "ConsumerDLQ",
            enforce_ssl=True
        )

        rule.add_target(
            event_targets.LambdaFunction(
                lambda_function, retry_attempts=3, dead_letter_queue=dlq
            )
        )

        NagSuppressions.add_resource_suppressions(
            construct=dlq,
            suppressions=[
                NagPackSuppression(
                    id="AwsSolutions-SQS3",
                    reason="The rule target correctly has the DLQ configured",
                )
            ],
        )
