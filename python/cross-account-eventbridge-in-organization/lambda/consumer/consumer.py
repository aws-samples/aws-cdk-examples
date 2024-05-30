"""Defines the consumer Lambda function handler"""

import logging
import os

logger = logging.getLogger(__name__)
logger.setLevel(os.environ.get("LOG_LEVEL", "WARNING").upper())


def handler(payload, _context):
    """
    Logs a consumed event from EventBridge.

    Args:
        * payload (any): The incoming EventBridge event payload

    """
    logger.debug("Event: %s", payload)
    logger.info("Event consumed")
