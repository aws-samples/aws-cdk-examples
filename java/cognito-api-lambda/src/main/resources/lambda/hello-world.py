import json

def handler(event, context):
    print(event)
    return {
        'statusCode': 200,
        'body': 'Hello world!'
    }
