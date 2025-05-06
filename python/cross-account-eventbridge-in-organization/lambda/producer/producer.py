"""Defines the producer Lambda function handler"""

import logging
import os
import json
import boto3

logger = logging.getLogger(__name__)
logger.setLevel(os.environ.get("LOG_LEVEL", "WARNING").upper())

event_bridge = boto3.client("events")


def handler(payload, _context):
    """
    Publishes an event to EventBridge.

    Args:
        * payload (any): The incoming EventBridge event payload

    """
    logger.debug("Payload: %s", payload)

    posted_event = event_bridge.put_events(
        Entries=[
            {
                "Source": os.environ.get("SOURCE"),
                "DetailType": os.environ.get("DETAIL_TYPE"),
                "Detail": json.dumps(payload),
                "EventBusName": os.environ.get("EVENT_BUS_NAME"),
            }
        ]
    )

    logger.debug("Posted Event: %s", posted_event)

    if posted_event["FailedEntryCount"] > 0:
        logger.error("Error Posting Event: %s", posted_event["Entries"])
    else:
        logger.debug("Successfully posted event")
