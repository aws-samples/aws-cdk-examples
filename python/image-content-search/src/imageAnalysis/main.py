import boto3
import botocore.config
import os
import logging
import json

aws_config = botocore.config.Config(
    region_name = os.getenv('REGION'),
    signature_version = 'v4',
    retries = {
        'max_attempts': int(os.getenv('DEFAULT_MAX_CALL_ATTEMPTS', '1')),
        'mode': 'standard'
    }
)

logger = logging.getLogger()
logger.setLevel(logging.INFO)

events_client = boto3.client('events', config=aws_config)
rekognition_client = boto3.client('rekognition', config=aws_config)

event_bus_name = os.getenv('EVENT_BUS')

# this function
# gets the SQS message
# calls Amazon Rekognition to analyze the image
# publish an event in Amazon EventBridge

def handler(event, context):

    for record in event['Records']:
        # receiptHandle = record['receiptHandle']
        body = record['body']
        message = json.loads(body)

        bucket = os.environ['ICS_IMAGES_BUCKET']
        key = message['image']
        # original_key = message['original_key']
        # original_last_modified = message['original_last_modified']
        # etag = message['etag']

        logger.info('Processing {}.'.format(key))

        detected_labels = rekognition_client.detect_labels(
            Image={'S3Object': {'Bucket': bucket, 'Name': key}},
            MaxLabels=20,
            MinConfidence=85)

        detected_unsafe_contents = rekognition_client.detect_moderation_labels(
            Image={'S3Object': {'Bucket': bucket, 'Name': key}})

        object_labels = []

        for l in detected_labels['Labels']:
            object_labels.append(l['Name'].lower()) # add objects in image

        for l in detected_unsafe_contents['ModerationLabels']:
            if ('offensive' not in object_labels): object_labels.append("offensive") #label image as offensive
            object_labels.append(l['Name'].lower())

        image_id = key.split("/")[-1]

        response = events_client.put_events(
            Entries=[
                {
                    'Source': "EventBridge",
                    'Resources': [
                        context.invoked_function_arn,
                    ],
                    'DetailType': 'images_labels',
                    'Detail': json.dumps({"labels": object_labels, "image_id": image_id}),
                    'EventBusName': event_bus_name
                },
            ]
        )

        if response["FailedEntryCount"] == 1:
            raise Exception(f'Failed entry observed. Count: {response["Entries"]}')
