import json
import os
import boto3

def handler(event, context):
    s3client = boto3.client('s3')
    Splitlist_KEY = event['JobParameter']['String_Split']['OUTPUT_KEY'] + '/' + event['BasicParameters']['INPUT_KEY'] + '_splitlist'
    response = s3client.get_object(Bucket=event['BasicParameters']['INPUT_BUCKET'], Key=Splitlist_KEY)
    splitlist = []
    index = 0
    for i in response['Body']._raw_stream.readlines():
        if i.decode().strip() != event['BasicParameters']['INPUT_KEY'] + '_splitlist':
            index += 1
            splitlist.append({
                "INDEX":str(index),
                "INPUT_KEY":event['JobParameter']['String_Split']['OUTPUT_KEY'] + '/' + i.decode().strip(),
                "INPUT_BUCKET":event['BasicParameters']['INPUT_BUCKET'],
                "OUTPUT_BUCKET":event['BasicParameters']['OUTPUT_BUCKET'],
                "String_Reverse":{
                    "Name":"String_Reverse",
                    "OUTPUT_KEY":event['JobParameter']['String_Reverse']['OUTPUT_KEY']
                },
                "String_Repeat":{
                    "Name":"String_Repeat",
                    "OUTPUT_KEY":event['JobParameter']['String_Repeat']['OUTPUT_KEY']
                }
            })
    return splitlist