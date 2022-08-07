import boto3
import json
import logging
import urllib.parse
import os

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client('s3')
mnt = '/mnt/data/'

def lambda_handler(event, context):
    logger.info(json.dumps(event))

    bucket = event['Records'][0]['s3']['bucket']['name']
    key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'], encoding='utf-8')
    event_name = event['Records'][0]['eventName']

    if event_name == 'ObjectCreated:Put':
        gen_obj(bucket, key)

    if event_name == 'ObjectRemoved:Delete':
        del_sync(key)

def del_sync(object_name):
    try:
        path = mnt + object_name
        os.remove(path)

        logger.info('The object has been removed')
        logger.info(object_name)
        logger.info(os.listdir(mnt))
    except Exception as e:
        print(e)
        raise e

def gen_obj(bucket_name, object_name):
    try:
        path = mnt + object_name
        s3.download_file(bucket_name, object_name, path)

        logger.info('An object has been created')
        logger.info(object_name)
        logger.info(os.listdir(mnt))
    except Exception as e:
        print(e)
        raise e
