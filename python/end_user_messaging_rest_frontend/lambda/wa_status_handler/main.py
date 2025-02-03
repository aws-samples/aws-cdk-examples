import os
import json
import boto3
import logging
import botocore.exceptions
from datetime import datetime, timedelta, UTC
from boto3.dynamodb.conditions import Attr, Key

dynamodb = boto3.resource('dynamodb')
consent_table = dynamodb.Table(os.environ['CONSENT_TABLE_NAME'])
tracking_table = dynamodb.Table(os.environ['TRACKING_TABLE_NAME'])
msg_status = {'unknown': -999, 'failed': -1, 'created': 0, 'sent_for_delivery': 1,
              'accepted': 2, 'sent': 3, 'delivered': 4, 'read': 5}


def get_message_status(msg_id: str | None, whatsapp_msg_id: str) -> dict | None:
    # Try to get the current message ID status, in the table we
    # might either the WhatsApp or the AWS msg id
    response = tracking_table.query(IndexName='WhatsAppMessageId',
                                    KeyConditionExpression=Key('wa_msg_id').eq(whatsapp_msg_id))
    if response.get('Count', 0) > 0:
        msg_id = response['Items'][0]['eum_msg_id']

    response = tracking_table.get_item(Key={'eum_msg_id': msg_id})
    if 'Item' in response:
        return response['Item']

    return None


def update_message_status(msg_id: str | None, whatsapp_msg_id: str, new_status: str, timestamp: datetime) -> None:
    """
    Update the message history and status in the Message tracking DynamoDB table
    """
    details = get_message_status(msg_id, whatsapp_msg_id)
    if details is None:
        raise RuntimeError(f'Cannot find message with id {whatsapp_msg_id}, failing')
    if details['wa_msg_id'] == '__UNKNOWN__':
        details['wa_msg_id'] = whatsapp_msg_id

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
            details = get_message_status(msg_id, whatsapp_msg_id)

    raise RuntimeError('Could not update the message status')


def register_consent(sender_id: str, start_time: datetime):
    """
    Register the fact that the user messaged us, opening a 24h communications
    window where we can send free-form messages
    """
    ttl = int((start_time + timedelta(hours=23, minutes=50)).timestamp())
    consent_table.put_item(Item={'phone_id': sender_id,
                                 'user_consents': True,
                                 'expiration_date': ttl})


def handler(event, _):
    """
    Handle a WhatsApp WebHook event.

    WhatsApp sends these when the conversations we're part of have been updated in any way, such as:
    - User has replied/reacted to a message
    - Message status updates (message has been delivered/read/failed to deliver...)

    More info on how WhatsApp webhooks work at
    https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks

    We want to react to these notifications in two ways:
    - If the user has written to us, we have 24h through which we can message them with free text messages.
      We track these events in the CONSENT_TABLE_NAME table, so that we know in other parts of the stack
      that we can message the user normally. These entries are short-lived in the consent table and are removed
      after ~24h), but do contain phone numbers.
    - Message delivery notifications are stored for traceability. We record the full history of the message for
      several months. We only store metadata about the interactions, not the content of the communications or
      phone numbers.
    - Other message types are simply ignored.
    """
    batch_item_failures = []
    for record in event.get('Records', []):
        # Fetch the End User Messaging-specific message ID
        # We should only get it if this message is for a `accepted` status
        notification = json.loads(record['body'])
        msg_id = notification.get('messageId')
        entry = json.loads(notification['whatsAppWebhookEntry'])
        for change in entry.get('changes', []):
            if 'value' not in change:
                logging.debug(f'Skipping malformed message as there is no `values` key. Existing keys: {change.keys()}')
                continue
            if 'statuses' in change['value']:
                # A message has changed its status, register it in the table
                for update in change['value']['statuses']:
                    if 'id' not in update:
                        filtered_info = {k: v for k, v in update.items() if k != 'recipient_id'}
                        logging.error(f'Failed to parse message WhatsApp response, skipping: {filtered_info}')
                        continue
                    whatsapp_msg_id = update['id']
                    status = update['status']
                    try:
                        timestamp = datetime.fromtimestamp(int(update['timestamp']))
                    except (ValueError, TypeError) as e:
                        logging.warning(f'Could not parse msg timestamp ({update["timestamp"]}), using current time')
                        timestamp = datetime.now(tz=UTC)

                    try:
                        update_message_status(msg_id, whatsapp_msg_id, status, timestamp)
                    except RuntimeError:
                        batch_item_failures.append({"itemIdentifier": record['messageId']})
            elif 'messages' in change['value']:
                # The user has written to us, thus opening a new 24h communication window
                for msg in change['value']['messages']:
                    sender_id = msg['from']
                    if not sender_id.startswith('+'):
                        sender_id = f'+{sender_id}'
                    try:
                        send_time = datetime.fromtimestamp(int(msg['timestamp']))
                    except (ValueError, TypeError):
                        send_time = datetime.now(tz=UTC)

                    register_consent(sender_id=sender_id, start_time=send_time)
            else:
                logging.info(f'Skipping unsupported message type: {change["value"].keys()}')

    return {'batchItemFailures': batch_item_failures}
