import os
import json
import boto3
import logging
import botocore.exceptions
from datetime import datetime, UTC
from boto3.dynamodb.conditions import Attr

dynamodb = boto3.resource('dynamodb')
tracking_table = dynamodb.Table(os.environ['TRACKING_TABLE_NAME'])
msg_status_translation = {'TEXT_SUCCESSFUL': 'sent',
                          'TEXT_DELIVERED': 'delivered'}
msg_status = {'unknown': -999, 'failed': -1, 'sent_for_delivery': 0,
              'sent': 1, 'delivered': 2}


def get_message_status(msg_id: str | None) -> dict | None:
    response = tracking_table.get_item(Key={'eum_msg_id': msg_id})
    if 'Item' in response:
        return response['Item']

    return None


def update_message_status(msg_id: str | None, new_status: str, timestamp: datetime) -> None:
    """
    Update the message history and status in the Message tracking DynamoDB table
    """
    details = get_message_status(msg_id)
    if details is None:
        raise RuntimeError(f'Cannot find message with id {msg_id}, failing')

    # Update the record to the new status, checking consistency
    for i in range(5):
        latest_update = details['latest_update']
        if msg_status.get(new_status, -999) > msg_status.get(details['latest_status'], -1):
            details['latest_status'] = new_status
            details['latest_update'] = int(datetime.now(tz=UTC).timestamp())

        if new_status not in details['delivery_history'].values():
            details['delivery_history'][timestamp.isoformat()] = new_status

        try:
            # We can just update the existing element since we're not altering the key
            tracking_table.put_item(Item=details, ConditionExpression=Attr('latest_update').eq(latest_update))
            return
        except botocore.exceptions.ClientError as e:
            logging.error(f'Failed to update the status of the message ({e}). This probably means that the message '
                          f'status was updated separately. Retrying...')
            details = get_message_status(msg_id)

    raise RuntimeError('Could not update the message status')


def handler(event, _):
    """
    Handle a SMS status update notifications.

    Message delivery notifications are stored for traceability. We record the full history of the message for
    several months. We only store metadata about the interactions, not the content of the communications or
    phone numbers.
    """
    batch_item_failures = []
    for record in event.get('Records', []):
        # Fetch the End User Messaging-specific message ID
        # We should only get it if this message is for a `accepted` status
        notification = json.loads(record['body'])
        details = notification.get('detail', {})
        msg_id = details.get('messageId')
        if msg_id is None:
            logging.error(f'Failing to parse message without message ID: {notification}')
            continue
        status = msg_status_translation[details['eventType']]
        try:
            timestamp = datetime.fromtimestamp(details['eventTimestamp'] / 1000)
        except (ValueError, TypeError) as e:
            logging.warning(f'Could not parse msg timestamp ({details["eventTimestamp"]}), using current time')
            timestamp = datetime.now(tz=UTC)

        try:
            update_message_status(msg_id, status, timestamp)
        except RuntimeError:
            batch_item_failures.append({"itemIdentifier": msg_id})

    return {'batchItemFailures': batch_item_failures}
