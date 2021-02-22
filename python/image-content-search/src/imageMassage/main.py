import boto3
import os
import logging
import hashlib
import json
import botocore

logger = logging.getLogger()
logger.setLevel(logging.INFO)

queue_name = os.environ["ICS_IMAGE_MASSAGE"]
sqs = boto3.resource('sqs')

# this function
# downloads the image from S3
# calculates the SHA1 hash checksum to prevent re-analysing images
# renames the object with prefix "processed"
# adds the metadata to SQS queue
# deletes the local copy

def handler(event, context):
    s3 = boto3.resource('s3')

    for record in event['Records']:
        newKey = record['s3']['object']['key']
        bucket = record['s3']['bucket']['name']
        name = bucket.split("/")[-1]
        localfile = "/tmp/{}".format(name)

        # download the file
        new_key_obj = s3.Object(bucket, newKey)
        new_key_obj.download_file(localfile)

        # calc hash
        image_SHA1 = getSha1(localfile)

        # check if not exist
        processed_key = "processed/{}/{}".format(image_SHA1[:2], image_SHA1)
        key_is_processed = isS3ObjectExist(bucket, processed_key)
        if key_is_processed: continue

        # add to the queue
        message = json.dumps({
            "image": processed_key,
            "original_key": newKey,
            "original_last_modified": new_key_obj.last_modified,
            "etag": new_key_obj.e_tag
        }, default=str)

        queue = sqs.get_queue_by_name(QueueName=queue_name)
        response = queue.send_message(MessageBody=message)
        logger.info("Message {} has been sent.".format(response.get('MessageId')))

        #move the image
        s3.Object(bucket, processed_key).copy_from(CopySource="{}/{}".format(bucket,newKey))
        new_key_obj.delete()

        # delete local file
        os.remove(localfile)

    return True

def isS3ObjectExist(bucket, key):
    s3 = boto3.resource('s3')

    try:
        s3.Object(bucket,key)
        return False
    except botocore.exceptions.ClientError as e:
        if e.response['Error']['Code'] == "404":
            return True
        else:
            raise e

def getSha1(filepath):
    sha1 = hashlib.sha1()

    with open(filepath, 'rb') as f:
        while True:
            data = f.read(65536) # read in 64kb chunks
            if not data: break
            sha1.update(data)

    return sha1.hexdigest()