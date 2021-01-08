import boto3
import json
import logging
import time

logger = logging.getLogger()
logger.setLevel(logging.INFO)

client = boto3.client('servicediscovery')

def get_instance_id(event):
    try:
        message = event['Records'][0]['Sns']['Message']
        return json.loads(message)['EC2InstanceId']
    except KeyError as err:
        logger.error(err)
        return False

def get_namespace_id():
    try:
        response = client.list_namespaces(
            Filters = [{
                'Name': 'TYPE',
                'Values': ['HTTP'],
                'Condition': 'EQ'
            },]
        )
        return response['Namespaces'][0]['Id']
    except KeyError as err:
        logger.error(err)
        return False

def get_service_id(namespace_id):
    try:
        response = client.list_services(
            Filters = [{
                'Name': 'NAMESPACE_ID',
                'Values': [namespace_id],
                'Condition': 'EQ'
            },]
        )
        return response['Services'][0]['Id']
    except KeyError as err:
        logger.error(err)
        return False

def list_instances(service_id):
    response = client.list_instances(
        ServiceId = service_id,
    )
    logger.info(json.dumps(response))

def deregister_instance(service_id, instance_id):
    response = client.deregister_instance(
        ServiceId = service_id,
        InstanceId = instance_id
    )
    logger.info(json.dumps(response))

def lambda_handler(event, context):
    logger.info(json.dumps(event))

    session = boto3.session.Session()
    namespace_id = get_namespace_id()
    service_id = get_service_id(namespace_id)

    list_instances(service_id)
    logger.info("Deregistering")
    deregister_instance(service_id, get_instance_id(event))
    time.sleep(5)
    list_instances(service_id)
