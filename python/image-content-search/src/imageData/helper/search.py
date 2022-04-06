import boto3
import botocore
import os
import logging
import json

from helper import execute_statement, logger  # type: ignore

aws_config = botocore.config.Config(
    region_name = os.getenv('REGION'),
    signature_version = 'v4',
    retries = {
        'max_attempts': int(os.getenv('DEFAULT_MAX_CALL_ATTEMPTS', '1')),
        'mode': 'standard'
    }
)

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# this module
# looks for images in the database
# translates the keywords if needed

def search_label(label, country = None, language = None):
    if language and language != 'en':
        translated_label = translate(language, label)
        logger.info("Translated label {} ({}) to {} (en).".format(label, language, translated_label))
        label = translated_label

    statement = "SELECT image_id FROM tags WHERE label=:label"
    parameters = [{'name':'label', 'value':{'stringValue': label.lower()}}]
    result = execute_statement(statement, parameters)

    logger.info(result)

    response = []

    for record in result["records"]:
        for item in record:
            response.append({
                "id": item["stringValue"]
            })

    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json; charset=UTF-8'
        },
        'body': json.dumps(response)
    }

def translate(language, word):
    translate = boto3.client(service_name='translate', config=aws_config)
    result = translate.translate_text(Text=word, SourceLanguageCode=language, TargetLanguageCode="en")

    return result.get('TranslatedText')


def get_http_params(body):
    params = {}

    for param in body.split('&'):
        key, value = param.split('=')
        params[key] = value

    return params
