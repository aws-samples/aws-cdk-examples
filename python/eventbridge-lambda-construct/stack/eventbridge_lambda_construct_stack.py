from constructs import Construct
import time
from aws_cdk import (
    aws_events as events,
    aws_lambda_destinations as lambda_event_destinations,
    Aws, Stack, Duration, CfnOutput,
)
from stack.ServiceConstruct import ServiceConstruct

class EventbridgeLambdaConstructStack(Stack):

    def __init__(self, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        #======================================================
        # Infrastructure Wide Deployment
        #======================================================

        # Get current time, used to force generation of new services versions on infrastructure update.
        timestamp_str = str(int(time.time()))

        # Create the event bus for source requests
        source_bus = events.EventBus(self,
            id="source_bus",
            event_bus_name="source_bus"
        )

        # Create another event bus for responses
        output_bus = events.EventBus(self,
            id="output_bus",
            event_bus_name="output_bus"
        )

        # Create Archives for replay and debugging
        source_bus.archive("source_bus",
            archive_name="SourceBusArchive",
            description="source_bus archive",
            event_pattern=events.EventPattern(
                account=[Stack.of(self).account]
            ),
            retention=Duration.days(5)
        )
        output_bus.archive("ouput_bus",
            archive_name="OutputBusArchive",
            description="output_bus archive",
            event_pattern=events.EventPattern(
                account=[Stack.of(self).account]
            ),
            retention=Duration.days(5)
        )

        # Create destinations
        output_bus_destination = lambda_event_destinations.EventBridgeDestination(output_bus)
        source_bus_destination = lambda_event_destinations.EventBridgeDestination(source_bus)


        #======================================================
        # Services Deployment
        #======================================================

        # This service write back to its source bus
        backtosource = ServiceConstruct(self,
            id="backtosource",
            timestamp=timestamp_str,
            on_success=source_bus_destination,
            source_bus=source_bus,
        )
        
        # This service write back to another bus
        toanother = ServiceConstruct(self,
            id="toanother",
            timestamp=timestamp_str,
            on_success=output_bus_destination,
            source_bus=source_bus,
        )
        
        #======================================================
        # Console Outputs
        #======================================================
        
        CfnOutput(self, "Current timestamp version", value=timestamp_str)
        CfnOutput(self, "Stack region", value=self.region)
        CfnOutput(self, 'event_bus Arn', value= source_bus.event_bus_arn)
        CfnOutput(self, 'output_bus Arn', value= output_bus.event_bus_arn)
        
