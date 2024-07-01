import base64
import gzip
import logging
import json
import jmespath
import requests
import os
from datetime import datetime
from requests_auth_aws_sigv4 import AWSSigV4

def cw_subscription_handler(event, context):

    """Extract the data from the event"""
    data = jmespath.search("awslogs.data", event)

    """Decompress the logs"""
    cwLogs = decompress_json_data(data)

    """Construct the payload to send to OpenSearch Ingestion"""
    payload = prepare_payload(cwLogs)

    """Ingest the set of events to the pipeline"""
    response = ingestData(payload)

    return {
        'statusCode': 200,
        'execute-api': {
            'status_code': response.status_code,
            'response': response.text
        }
    }
def decompress_json_data(data):
    compressed_data = base64.b64decode(data)
    uncompressed_data = gzip.decompress(compressed_data)
    return json.loads(uncompressed_data)

def prepare_payload(cwLogs):
    payload = []
    logEvents = cwLogs['logEvents']
    for logEvent in logEvents:
        request = {}
        request['@id'] = logEvent['id']
        request['@timestamp'] = str(datetime.now().year) + '0' + str(datetime.now().month) + '0' + str(datetime.now().day)
        request['@message'] = logEvent['message']
        request['@owner'] = cwLogs['owner']
        request['@log_group'] = cwLogs['logGroup']
        request['@log_stream'] = cwLogs['logStream']

        payload.append(request)
    return payload

def ingestData(payload):
    ingestionEndpoint = os.environ["OSI_INGESTION_ENDPOINT"]
    endpoint = 'https://' + ingestionEndpoint
    response = requests.request('POST', f'{endpoint}/logs/ingest', data=json.dumps(payload), auth=AWSSigV4('osis'))
    print('Response received: ' + response.text)
    return response