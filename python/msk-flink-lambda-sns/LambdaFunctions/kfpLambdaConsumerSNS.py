# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0


import base64
import boto3
import json
import os

sns = boto3.client('sns')

def lambda_handler(event, context):
    topic_arn = os.environ["SNSTopicArn"]
    for partition_key, partition_value in event['records'].items():
        for record_value in partition_value:
            data = json.loads(base64.b64decode(record_value['value']))
            subject = "The sensor reading has exceeded the threshold"
            message = f"Sensor Id: {data['sensor_id']} has exceeded the set threshold at the window start time: {data['start_event_time']}"
            sns.publish(
                TargetArn=topic_arn,
                Message=message,
                Subject=subject
            )