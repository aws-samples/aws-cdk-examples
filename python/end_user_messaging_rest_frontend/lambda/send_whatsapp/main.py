import os
import json
import boto3
import logging
import botocore.exceptions
from datetime import datetime, timedelta, UTC

whatsapp = boto3.client('socialmessaging')
dynamodb = boto3.resource('dynamodb')
consent_table = dynamodb.Table(os.environ['CONSENT_TABLE_NAME'])
msg_tracking_table = dynamodb.Table(os.environ['MESSAGE_TRACKING_TABLE_NAME'])
template_name = os.environ['WA_TEMPLATE_NAME']
whatsapp_phone_id = os.environ['WHATSAPP_PHONE_ID']


def send_message(sender_id: str, whatsapp_message: dict) -> str | None:
    """
    Function used for actually sending the WhatsApp mesasge with Social Messaging
    """
    try:
        # Convert the message to a JSON string and then to bytes (no Base64 encoding needed)
        message_json = json.dumps(whatsapp_message).encode()

        # Send the WhatsApp message
        response = whatsapp.send_whatsapp_message(originationPhoneNumberId=sender_id,
                                                  message=message_json,
                                                  metaApiVersion='v20.0')
        return response.get('messageId')

    except botocore.exceptions.ClientError as e:
        logging.exception(e)
        return None


def generate_template(recipient_id: str, template_name: str) -> dict | None:
    """
    Generate a dict payload representing a default template WhatsApp Text message

    If there is no need to send the template (because the communication window is still open)
    `None` will be returned.
    """
    # Send the template & update the window open time
    return {"messaging_product": "whatsapp",
            "to": f'{recipient_id}',
            "type": "template",
            "template": {"name": template_name,
                         "language": {"code": "es_ES"}}}


def generate_text(recipient_id: str, message: str) -> dict:
    """
    Generate a dict payload representing a regular WhatsApp Text message
    """
    whatsapp_message = {"messaging_product": "whatsapp",
                        "type": "text",
                        "preview_url": True,
                        "to": f"{recipient_id}",
                        "text": {"body": message}}

    return whatsapp_message


def with_recipient_consent(recipient_id: str) -> bool:
    """
    Determine if we have the user's consent to send free-form messages

    We will only have this if the user has written to us in the last 24h, which triggers
    a registration in the corresponding DynamoDB table
    """
    response = consent_table.get_item(Key={'phone_id': recipient_id})
    return response.get('Item', {}).get('user_consents', False)


def consent_request_sent(recipient_id: str) -> bool:
    """
    Determine if we have already sent the consent request
    """
    response = consent_table.get_item(Key={'phone_id': recipient_id})
    return response.get('Item', {}).get('consent_requested', False)


def handler(event, _):
    failed_msgs = []
    # Handle messages one by one (by the construct of the application we should only be getting one, though)
    for record in event.get('Records', []):
        payload = json.loads(record.get('body'))
        recipient_id = payload.get('destination_number')
        message = payload.get('message_body')
        if recipient_id is None or message is None:
            logging.warning(f'Skipping empty message in event.')
            continue

        if not recipient_id.startswith('+'):
            recipient_id = f'+{recipient_id}'

        # If the user has provided consent to be messaged, just send the message
        now = datetime.now(tz=UTC)
        if with_recipient_consent(recipient_id):
            msg_id = send_message(sender_id=whatsapp_phone_id,
                                  whatsapp_message=generate_text(recipient_id, message))
            status = 'sent_for_delivery'
            ttl = int((now + timedelta(days=365)).timestamp())
            msg_tracking_table.put_item(Item={'type': 'whatsapp',
                                              'eum_msg_id': msg_id,
                                              'wa_msg_id': '__UNKNOWN__',
                                              'latest_status': status,
                                              'latest_update': int(now.timestamp()),
                                              'delivery_history': {now.isoformat(): 'sent_for_delivery'},
                                              'expiration_date': ttl,
                                              'registration_date': now.isoformat()})
        else:
            if not consent_request_sent(recipient_id):
                send_message(sender_id=whatsapp_phone_id,
                             whatsapp_message=generate_template(recipient_id, template_name))
                ttl = int((now + timedelta(days=7)).timestamp())
                consent_table.put_item(Item={'phone_id': recipient_id,
                                             'consent_requested': True,
                                             'user_consents': False,
                                             'request_date': now.isoformat(),
                                             'expiration_date': ttl})
            else:
                # Register the message processing as failed, so that the message
                # is sent back to the queue
                failed_msgs.append({'itemIdentifier': record['messageId']})

    return {'batchItemFailures': failed_msgs}
