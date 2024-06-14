# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import time
import boto3
import os
import json

from dynamodb_encryption_sdk.encrypted.table import EncryptedTable
from dynamodb_encryption_sdk.identifiers import CryptoAction
from dynamodb_encryption_sdk.material_providers.aws_kms import AwsKmsCryptographicMaterialsProvider
from dynamodb_encryption_sdk.structures import AttributeActions

kmsMultiRegionKeyId=os.environ['kmsMultiRegionKeyId']
ddbTokenTable=os.environ['ddbTokenTable']


def lambda_handler(event, context):

    try:
             
        # what key are we looking for? Event is a dictionary that contains the field 'tokenId' with the
        # required lookup value
        recordId = event

        table = boto3.resource('dynamodb').Table(ddbTokenTable)

        awsKmsCmp = AwsKmsCryptographicMaterialsProvider(key_id=kmsMultiRegionKeyId)

        actions = AttributeActions(
            default_action=CryptoAction.ENCRYPT_AND_SIGN,
            attribute_actions={'TTL': CryptoAction.DO_NOTHING}
        )

        encryptedTable = EncryptedTable(
            table=table,
            materials_provider=awsKmsCmp,
            attribute_actions=actions
        )


        response = encryptedTable.get_item(Key=recordId)
        
        # did we find a record?
        if 'Item' in response.keys():
            print('found record, checking expiry')

            # we found an element, but has it expired?
            item = response['Item']
            if 'TTL' in item.keys():

                if item['TTL'] < time.time():
                    # record has expired, return nothing
                    print('no item found - TTL expired')
                    raise Exception("item expired")
                else:
                    print("Item found, returning")
                    return item
                
            else:
                # no TTL expiry - return
                print("Item found, returning")
                return item

        else:
            # did not find a item
            print('no item found')
            raise Exception("no item found")
        
    except:
        print("An exception occurred")
        raise
    