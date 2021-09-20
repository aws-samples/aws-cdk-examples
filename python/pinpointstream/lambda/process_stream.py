import boto3
import base64
import json
import ast
import os


def handler(event, context):
    dynamodb = boto3.client('dynamodb')
    
    for record in event['Records']:
        # Kinesis data is base64 encoded
        payload = base64.b64decode(record['kinesis']['data']).decode('utf-8')
        print("Decoded payload: " + payload )
        
        payload = ast.literal_eval(payload)
        
        (dynamodb.put_item(TableName=os.environ['STREAM_TABLE_NAME'], Item=
        {'event_timestamp':{'S':str(payload["event_timestamp"])},
        'app_id':{'S':payload["application"]["app_id"]},
        'destination_phone_number':{'S':payload["attributes"]["destination_phone_number"]},
        'iso_country_code':{'S':payload["attributes"]["iso_country_code"]},
        'record_status':{'S':payload["attributes"]["record_status"]},
        'origination_phone_number':{'S':payload["attributes"]["origination_phone_number"]},
        'price_in_millicents_usd':{'S':str(payload["metrics"]["price_in_millicents_usd"])},
        'awsAccountId':{'S':payload["awsAccountId"]},
        }))
        
        
    return 'Successfully processed {} records.'.format(len(event['Records']))