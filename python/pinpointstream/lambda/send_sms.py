import boto3
import json
import random
import os


pinpoint = boto3.client('pinpoint')


def handler(event, context):
    phone_number = 'insert'
    
    response = pinpoint.send_messages(
        ApplicationId=os.environ['PINPOINT_APP_NAME'],
        MessageRequest={
            'Addresses': {
                phone_number: {'ChannelType': 'SMS'}
            },
            'MessageConfiguration': {
                'SMSMessage': {
                    'Body': 'Test message sent by pinpoint',
                    'MessageType': 'PROMOTIONAL',
                    'SenderId': 'SenderTestBot'
                }
            }
        }
    )
    
    print(response)
    
    return response