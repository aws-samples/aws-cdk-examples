import os
import json
import boto3
import base64
from botocore.exceptions import ClientError

def lambda_handler(event, context):
    resp_data = {}
    auth_map = {
        "dynamo" : auth_dynamo,
        "secrets" : get_secret
    }
    if os.environ.get("dynamo_table_name"):
        auth = auth_map["dynamo"]
    elif os.environ.get("SecretsManagerRegion"):
        auth = auth_map["secrets"]
    else:
        print("No authentication method set")
        return {}


    if 'username' not in event or 'serverId' not in event:
        print("Incoming username or serverId missing  - Unexpected")
        return resp_data

    input_username = event['username']
    print("Username: {}, ServerId: {}".format(input_username, event['serverId']))

    if 'password' in event:
        input_password = event['password']
    else:
        print("No password, checking for SSH public key")
        input_password = ''

    # Lookup user's account in creds store
    resp = auth(input_username)

    if resp != None:
        resp_dict = resp
    else:
        print("Authentication Error")
        return {}

    if input_password != '':
        if 'Password' in resp_dict:
            resp_password = resp_dict['Password']
        else:
            print("Unable to authenticate user - No field match in Dynamodb for password")
            return {}

        if resp_password != input_password:
            print("Unable to authenticate user - Incoming password does not match stored")
            return {}
    else:
        # SSH Public Key Auth Flow - The incoming password was empty so we are trying ssh auth and need to return the public key data if we have it
        if 'PublicKey' in resp_dict:
            resp_data['PublicKeys'] = [resp_dict['PublicKey']]
        else:
            print("Unable to authenticate user - No public keys found")
            return {}

    # If we've got this far then we've either authenticated the user by password or we're using SSH public key auth and
    # we've begun constructing the data response. Check for each key value pair.
    # These are required so set to empty string if missing
    if 'Role' in resp_dict:
        resp_data['Role'] = resp_dict['Role']
    else:
        print("No field match for role - Set empty string in response")
        resp_data['Role'] = ''

    # These are optional so ignore if not present
    if 'Policy' in resp_dict:
        resp_data['Policy'] = resp_dict['Policy']

    if 'HomeDirectoryDetails' in resp_dict:
        print("HomeDirectoryDetails found - Applying setting for virtual folders")
        resp_data['HomeDirectoryDetails'] = resp_dict['HomeDirectoryDetails']
        resp_data['HomeDirectoryType'] = "LOGICAL"
    elif 'HomeDirectory' in resp_dict:
        print("HomeDirectory found - Cannot be used with HomeDirectoryDetails")
        resp_data['HomeDirectory'] = resp_dict['HomeDirectory']
    else:
        print("HomeDirectory not found - Defaulting to /")

    print("Completed Response Data: "+json.dumps(resp_data))
    return resp_data

def auth_dynamo(id):
    client = boto3.client('dynamodb')
    ret={}
    try:
        # lookup the user in the table
        response = client.get_item(
            TableName=os.environ['dynamo_table_name'],
            Key={
                'UserId': {
                    'S': id
                }
            }
        )
        # Extract the values from the response
        if response.get("Item"):
            for k, v in response.get("Item").items():
                ret[k]=list(v.values())[0]
            return ret
        else:
            return None
    except ClientError as err:
        print('Error Talking to Dynamo: ' + err.response['Error']['Code'] + ', Message: ' + str(err))
        return None

def get_secret(id):
    region = os.environ['SecretsManagerRegion']
    print("Secrets Manager Region: "+region)

    client = boto3.session.Session().client(service_name='secretsmanager', region_name=region)

    try:
        resp = client.get_secret_value(SecretId='SFTP/'+id)
        # Decrypts secret using the associated KMS CMK.
        # Depending on whether the secret is a string or binary, one of these fields will be populated.
        print(resp['SecretString'])
        if 'SecretString' in resp:
            print("Found Secret String")
            return json.loads(resp['SecretString'])
        else:
            print("Found Binary Secret")
            return json.loads(base64.b64decode(resp['SecretBinary']))
    except ClientError as err:
        print('Error Talking to SecretsManager: ' + err.response['Error']['Code'] + ', Message: ' + str(err))
        return None