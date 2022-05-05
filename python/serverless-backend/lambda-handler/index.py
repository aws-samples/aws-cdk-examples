import json
import base64
import boto3
import os
import uuid
import botocore
import imghdr

s3 = boto3.client('s3')
dynamodb = boto3.client('dynamodb')


def upload_metadata(key, userid):
    table = os.environ['table']
    bucket = os.environ['bucket']
    reference = {'Bucket': {'S': bucket}, 'Key': {'S': key}}
    response = dynamodb.put_item(
        TableName=table,
        Item={"userid": {
            'S': userid}, "photo_reference": {'M': reference}})
    print(response)


def upload_image(image_id, img, userid):
    bucket = os.environ['bucket']
    extension = imghdr.what(None, h=img)
    key = f"{image_id}.{extension}"
    try:
        s3.put_object(Bucket=bucket, Key=key, Body=img)
        upload_metadata(key, userid)
    except botocore.exceptions.ClientError as e:
        print(e)
        return False
    return True


def handler(event, context):
    print(event)
    # Generate random image id
    image_id = str(uuid.uuid4())

    data = json.loads(event['body'])
    userid = data['userid']
    img = base64.b64decode(data['photo'])

    if upload_image(image_id, img, userid):
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Headers': '*',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
            },
            'body': json.dumps('Success!')
        }
    return {
        'statusCode': 500,
        'headers': {
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
        },
        'body': json.dumps('Request Failed!')
    }
