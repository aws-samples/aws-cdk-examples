# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import boto3
import os
import json
import uuid


from dynamodb_encryption_sdk.encrypted.table import EncryptedTable
from dynamodb_encryption_sdk.identifiers import CryptoAction
from dynamodb_encryption_sdk.material_providers.aws_kms import AwsKmsCryptographicMaterialsProvider
from dynamodb_encryption_sdk.structures import AttributeActions

kmsMultiRegionKeyId=os.environ['kmsMultiRegionKeyId']
ddbTokenTable=os.environ['ddbTokenTable']
ddbPartitionKey=os.environ['ddbPartitionKey']
# the token prefix ensures that we don't have collisions between regions, and also ensures that we can trace
# a token back to the region that generated it if required 
tokenPrefix=os.environ['tokenPrefix']

def lambda_handler(event, context):

    try:
             
        # data is a json structure - a python dictionary
        plainTextRecord = event['data']
        newUUID = str(uuid.uuid4())
        newIndex = 'TKN-' + tokenPrefix + '-' + newUUID
        # we prepend the token with 'TKN' so that tokens are distinguishable from PANs - PCI DSS 2.3.4 Token Distinguishability 
        plainTextRecord[ ddbPartitionKey ] = newIndex
        
        table = boto3.resource('dynamodb').Table(ddbTokenTable)

        awsKmsCmp = AwsKmsCryptographicMaterialsProvider(key_id=kmsMultiRegionKeyId)

        actions = AttributeActions(
            default_action=CryptoAction.ENCRYPT_AND_SIGN,
            attribute_actions={
                'TTL': CryptoAction.DO_NOTHING
                }
        )

        encryptedTable = EncryptedTable(
            table=table,
            materials_provider=awsKmsCmp,
            attribute_actions=actions
        )
        
        response = encryptedTable.put_item(Item=plainTextRecord)

        print(response)
        return newIndex

    except:
        print("An exception occurred")     
        raise   