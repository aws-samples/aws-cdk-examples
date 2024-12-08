import json
def handler(event, context):
    fromValue = event.get('queryStringParameters', {}).get('from', 'Lambda')
    return {
        'statusCode': 200,
        'body': json.dumps('Bye from ' + fromValue + '!')
    }
