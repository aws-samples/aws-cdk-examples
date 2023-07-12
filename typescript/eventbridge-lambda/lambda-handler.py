import json
import boto3
import os
client = boto3.client('sns')

def main(event, context):
    print("I'm running!")
    response = client.publish(TopicArn=os.environ.get('TOPIC_ARN'),Message="Test message")
    print("Message published")
    return(response)