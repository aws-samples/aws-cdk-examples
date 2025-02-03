import os
import json
import boto3
import logging
import botocore.exceptions
from datetime import datetime, timedelta, UTC

dynamodb = boto3.resource('dynamodb')
message_type = os.environ.get('MESSAGE_TYPE')
sms_client = boto3.client('pinpoint-sms-voice-v2')
configuration_set = os.environ.get('CONFIGURATION_SET')
origination_entity = os.environ.get('ORIGINATION_ENTITY')
msg_tracking_table = dynamodb.Table(os.environ['MESSAGE_TRACKING_TABLE_NAME'])


def handler(event, context):
    failed_msgs = []

    for record in event.get('Records', []):
        body = json.loads(record['body'])

        destination_number = body.get('destination_number', '').strip()
        if len(destination_number) == 0:
            logging.error('Could not send message with no destination number, skipping')
            continue

        if not destination_number.startswith('+'):
            destination_number = f'+{destination_number}'

        message_body = body.get('message_body', '').strip()
        if len(message_body) == 0:
            logging.error("Could not send message with empty body")
            continue

        try:
            response = sms_client.send_text_message(ConfigurationSetName=configuration_set,
                                                    DestinationPhoneNumber=destination_number,
                                                    DryRun=False,
                                                    MaxPrice="2.00",
                                                    MessageBody=message_body,
                                                    MessageType=message_type,
                                                    OriginationIdentity=origination_entity,
                                                    TimeToLive=120)
        except sms_client.exceptions.ClientError as e:
            logging.exception(e)
            # Register the message processing as failed, so that the message
            # is sent back to the queue
            failed_msgs.append({'itemIdentifier': record['messageId']})
            continue

        now = datetime.now(tz=UTC)
        ttl = int((now + timedelta(days=365)).timestamp())
        try:
            msg_tracking_table.put_item(Item={'type': 'sms',
                                              'eum_msg_id': response['MessageId'],
                                              'wa_msg_id': '__UNKNOWN__',
                                              'latest_status': 'sent_for_delivery',
                                              'latest_update': int(now.timestamp()),
                                              'delivery_history': {now.isoformat(): 'sent_for_delivery'},
                                              'expiration_date': ttl,
                                              'registration_date': now.isoformat()})
        except botocore.exceptions.ClientError as e:
            # The message has been delivered, so we don't mark it as sent to avoid
            # sending it again to the recipient
            logging.error(f'Failed to register sent message with id {response["MessageId"]}')
            logging.exception(e)
            continue

    return {'batchItemFailures': failed_msgs}
