import json
import boto3
import logging
import os
import time
import hashlib

from botocore.exceptions import ClientError
images_bucket = os.environ['ICS_IMAGES_BUCKET']
default_signedurl_expiry_seconds = os.environ['DEFAULT_SIGNEDURL_EXPIRY_SECONDS']

# this function
# creates a pre-sighned URL for uploading image to S3 and returns it

def handler(event, context):
    uniquehash = hashlib.sha1("{}".format(time.time_ns()).encode('utf-8')).hexdigest()
    result = create_presigned_post(images_bucket, "new/{}/{}".format(uniquehash[:2],uniquehash))

    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json; charset=UTF-8'
        },
        'body': json.dumps(result)
    }

def create_presigned_post(bucket_name, object_name, fields=None, conditions=None, expiration=default_signedurl_expiry_seconds):
    s3_client = boto3.client('s3')

    try:
        response = s3_client.generate_presigned_post(bucket_name,
            object_name,
            Fields=fields,
            Conditions=conditions,
            ExpiresIn=int(expiration)
        )
    except ClientError as e:
        logging.error(e)
        return None

    return response