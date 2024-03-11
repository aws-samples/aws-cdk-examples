import boto3 
import json
import os 

DDB_TABLE_NAME = os.getenv('DDB_TABLE_NAME')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(DDB_TABLE_NAME)
#define lambda handler 
def lambda_handler(event, context):
    #get all item in DDB
    try: 
        response = table.scan()
        items = response['Items']
        print(items)

    except Exception as e:
        print(e)
        return {
            'statusCode': 500,
            'body': json.dumps('Internal Server Error')
        }
    
    #respond back with all item above in a html page 
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'text/html'
        },
        'body': '<html><body><ul>' + ''.join(['<li>' + item['id'] + '</li>' for item in items]) + '</ul></body></html>'

    }