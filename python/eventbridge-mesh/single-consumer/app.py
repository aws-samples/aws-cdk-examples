#!/usr/bin/env python3
from aws_cdk import (
    aws_events as events,
    aws_events_targets as targets,
    aws_logs as logs,
    aws_iam as iam,
    App, Stack, Environment
)
from constructs import Construct

class ProducerStack(Stack):
    def __init__(self, scope: Construct, id: str, *, 
                app_name: str, 
                consumer_account_id: str, 
                 **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # Create the EventBus
        producer_event_bus = events.EventBus(
            self, f"{app_name}-producer-event-bus"
        )

        # Create rule to forward events to consumer account
        rule = events.Rule(
            self, f"{app_name}-forward-to-consumer-rule",
            event_bus=producer_event_bus,
            event_pattern=events.EventPattern(
                source=['com.myapp.events']
            )
        )

        # Add target to forward to consumer account's event bus
        consumer_bus = events.EventBus.from_event_bus_arn(
            self,
            'ConsumerEventBus',
            f"arn:aws:events:{Stack.of(self).region}:{consumer_account_id}:event-bus/default"
        )
        rule.add_target(targets.EventBus(consumer_bus))

        # Optional: Add CloudWatch target for monitoring
        log_group = logs.LogGroup(self, f"{app_name}-producer-logs")
        rule.add_target(targets.CloudWatchLogGroup(log_group))


class ConsumerStack(Stack):
    def __init__(self, scope: Construct, id: str, *, 
                app_name: str, 
                producer_account_id: str, 
                 **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # Create or reference the consumer event bus
        consumer_event_bus = events.EventBus(
            self, f"{app_name}-consumer-event-bus"
        )

        # Add policy to allow producer account to put events
        consumer_event_bus.add_to_resource_policy(iam.PolicyStatement(
            sid="allowProducerAccount",
            effect=iam.Effect.ALLOW,
            principals=[iam.AccountPrincipal(producer_account_id)],
            actions=["events:PutEvents"],
            resources=[consumer_event_bus.event_bus_arn]
        ))

        # Create consumer rules
        consumer_rule = events.Rule(
            self, f"{app_name}-consumer-rule",
            event_bus=consumer_event_bus,
            event_pattern=events.EventPattern(
                source=['com.myapp.events'],
                detail_type=['specific-event-type']
            )
        )

        # Add target (e.g., CloudWatch)
        log_group = logs.LogGroup(self, f"{app_name}-consumer-logs")
        consumer_rule.add_target(targets.CloudWatchLogGroup(log_group))


app = App()

# Get context values
app_name = app.node.try_get_context("appName")
region   = app.node.try_get_context("region")
producer_account_id = app.node.try_get_context("producerAccountId")
consumer_account_id = app.node.try_get_context("consumer1AccountId")

# Create producer stack
producer_stack = ProducerStack(
    app, f"{app_name}-producer-stack",
    app_name=app_name,
    consumer_account_id=consumer_account_id,
    env=Environment(
        account=producer_account_id,
        region=region
    )
)

# Create consumer stack
consumer_stack = ConsumerStack(
    app, f"{app_name}-consumer-stack",
    app_name=app_name,
    producer_account_id=producer_account_id,
    env=Environment(
        account=consumer_account_id,
        region=region
    )
)

app.synth()
