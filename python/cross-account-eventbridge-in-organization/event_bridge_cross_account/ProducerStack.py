# pylint: disable=invalid-name
"""Defines the ProducerStack class"""

from typing import List
from constructs import Construct
from aws_cdk import (
    Stack,
    Duration,
    aws_events as events,
    aws_events_targets as targets,
    aws_lambda as _lambda,
    aws_iam as iam,
    Aspects,
)
from cdk_nag import AwsSolutionsChecks, NagSuppressions, NagPackSuppression


class ProducerStack(Stack):
    """
    Defines a CloudFormation Stack consisting of an EventBus, IAM Role,
    EventBus Rules, and a Lambda Function for producing test events to the
    EventBus.
    """

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        self.id = "Producer"
        self.event_bus_name = self.node.try_get_context("event_bus_name")

        self.event_bus = events.EventBus(
            self,
            self.id + "EB" + self.event_bus_name,
            event_bus_name=self.event_bus_name,
        )

        self.role = iam.Role(
            self,
            self.id + "Role",
            assumed_by=iam.ServicePrincipal("events.amazonaws.com"),
        )

        self.rules = self.deploy_rules(
            self.event_bus, self.role, self.node.try_get_context("rules")
        )
        self.producer = self.deploy_producer(self.event_bus)

        # Adds CDK Nag check to stack resources
        Aspects.of(self).add(AwsSolutionsChecks())

    def deploy_rules(
        self,
        event_bus: events.EventBus,
        role: iam.Role,
        rule_definitions: List[dict]
    ) -> List[events.Rule]:
        """
        Creates an EventBridge Rule for each specified rule defintion.

        Args:
            * event_bus (events.EventBus): The EventBridge bus for the new
                rules
            * role (iam.Role): The IAM Role assigned to each rule
            * rule_definitions (List[dict]): The list of EventBrige Rule
                definitions

        Returns:
            * List[events.Rule]: The list of create EventBridge Rules

        """
        rules = []
        for rule_definition in rule_definitions:
            rule = events.Rule(
                self,
                self.id + "Rule" + rule_definition["id"],
                event_bus=event_bus,
                event_pattern=events.EventPattern(
                    source=rule_definition["sources"],
                    detail_type=rule_definition["detail_types"],
                ),
            )

            for target in rule_definition["targets"]:
                rule.add_target(
                    target=targets.EventBus(
                        event_bus=events.EventBus.from_event_bus_arn(
                            self, target["id"], target["arn"]
                        ),
                        role=role,
                    ),
                )

            rules.append(rule)

        return rules

    def deploy_producer(self, event_bus: events.EventBus) -> _lambda.Function:
        """
        Creates a Lambda function to produce test events on the provided
        EventBus.

        Args:
            * event_bus (events.EventBus): The EventBridge bus to send test
                events

        Returns:
            * _lambda.Function: The created Lambda function

        """
        lambda_function = _lambda.Function(
            self,
            "ProducerLambda",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="producer.handler",
            timeout=Duration.seconds(30),
            code=_lambda.Code.from_asset("./lambda/producer"),
            environment={
                "LOG_LEVEL": "DEBUG",
                "SOURCE": "Producer",
                "DETAIL_TYPE": "TestType",
                "EVENT_BUS_NAME": event_bus.event_bus_name,
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

        event_bus.grant_put_events_to(lambda_function.role)

        return lambda_function
