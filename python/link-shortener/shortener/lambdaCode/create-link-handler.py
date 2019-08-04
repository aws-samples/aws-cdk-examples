import json
import os
import boto3
import random
import string

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])


def main(event, context):
    short_code = ''.join(random.choice(string.ascii_lowercase) for i in range(8))
    try:
        url = json.loads(event['body'])['url']
    except Exception as e:
        return {'statusCode': 400, "body": "no url found"}
    item = {'short_code': short_code, 'url': url}
    table.put_item(
        Item=item
    )
    return {
        "statusCode": 200,
        "body": json.dumps(item)
    }
