import json
import base64


def lambda_handler(event, context):
    
    records = event['records']
    
    for key in records:
        
        record = records[key]
        
        for message in record:
            topic = message['topic']
            
            contentb64_bytes = message['value'].encode('utf-8')
            content_bytes = base64.b64decode(contentb64_bytes)
            decoded_content = content_bytes.decode('utf-8')
            
            print(decoded_content)
        
    return {
        'statusCode': 200
    }
