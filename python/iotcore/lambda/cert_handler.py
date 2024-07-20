import json
import time
from botocore.exceptions import ClientError
import boto3

SECRET_NAME = "iot-cert-and-key-5"

iot = boto3.client('iot')
secrets_manager = boto3.client('secretsmanager')

def on_create(event):
    response = iot.create_keys_and_certificate(setAsActive=True)
    certificate_id = response['certificateId']
    certificate_pem = response['certificatePem']
    key_pair = response['keyPair']
    
    if not certificate_id or not certificate_pem or not key_pair:
        raise ValueError('Failed to create keys and certificate')

    secrets_manager.create_secret(
        Name=SECRET_NAME,
        SecretString=json.dumps({
            'cert': certificate_pem,
            'keyPair': key_pair['PrivateKey']
        })
    )
    
    return {
        'PhysicalResourceId': certificate_id,
        'Data': {
            'certificateId': certificate_id
        }
    }

def on_delete(event):
    try:
        secrets_manager.delete_secret(
            SecretId=SECRET_NAME,
            ForceDeleteWithoutRecovery=True
        )
    except ClientError:
        pass
        
    certificate_id = event['PhysicalResourceId']
    
    iot.update_certificate(
        certificateId=certificate_id,
        newStatus='INACTIVE'
    )
    
    time.sleep(2)
    
    iot.delete_certificate(
        certificateId=certificate_id
    )
    
def lambda_handler(event, context):
    print('Received event:', event)

    if event['RequestType'] == 'Create':
        return on_create(event)
    elif event['RequestType'] == 'Delete':
        return on_delete(event)

    raise ValueError('Unknown request type')
