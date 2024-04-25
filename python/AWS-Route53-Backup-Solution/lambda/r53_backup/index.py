import boto3
import json
import os
from datetime import datetime

def lambda_handler(event, context):
    client = boto3.client('route53')
    s3 = boto3.client('s3')
    #bucket_name = 'xxxx' 
    bucket_name=os.environ.get('BUCKET_NAME')

    today = datetime.now().strftime("%Y-%m-%d-%H-%M-%S")  # Current timestamp

    # Get the list of all hosted zones
    hosted_zones = client.list_hosted_zones()
    for zone in hosted_zones['HostedZones']:
        zone_id = zone['Id'].split('/')[-1]  # Extract the Zone ID
        records_response = client.list_resource_record_sets(HostedZoneId=zone_id)
        
        # Format the record sets into JSON
        formatted_records = json.dumps(records_response['ResourceRecordSets'], indent=4)
        
        
        object_key = f'{zone_id}/{today}/R53Backup-{zone_id}.json'
        
        # Save to S3
        s3.put_object(Bucket=bucket_name, Key=object_key, Body=formatted_records)

    return {
        'statusCode': 200,
        'body': json.dumps('Backup successful for all zones!')
    }
