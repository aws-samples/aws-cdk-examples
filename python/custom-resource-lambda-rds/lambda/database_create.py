import os
import cfnresponse
import boto3
import json
import logging
from sqlalchemy.engine.base import Engine
from sqlalchemy import create_engine, inspect


IS_VERBOSE = os.getenv('VERBOSE', 'False').lower() == 'true'
logger = logging.getLogger()
logger.setLevel(logging.DEBUG if IS_VERBOSE else logging.INFO)


def lambda_handler(event, context):
    logger.debug(event)
    physical_id = 'Unknown'

    try:
        rds_secret_name = event['ResourceProperties']['RDSSecretName']
        database_name = event['ResourceProperties']['DatabaseName']

        physical_id = 'CreateDatabase%s' % database_name
        # Check if this is a Create and we're failing Creates
        if event['RequestType'] == 'Create' and event['ResourceProperties'].get('FailCreate', False):
            raise RuntimeError('Create failure requested')

        engine = get_database_engine(
            secret_name=rds_secret_name)

        if event['RequestType'] == 'Create':
            response = handle_create_request(engine, database_name)
        elif event['RequestType'] == 'Delete':
            response = handle_delete_request(engine, database_name)
        elif event['RequestType'] == 'Update':
            old_rds_secret_name = event['OldResourceProperties']['RDSSecretName']
            old_database_name = event['OldResourceProperties']['DatabaseName']
            old_engine = get_database_engine(
                secret_name=old_rds_secret_name, database_name=old_database_name)
            response = handle_update_request(
                engine, database_name, old_engine, old_database_name)
        else:
            raise RuntimeError('Unknown request type')

        cfnresponse.send(event, context, cfnresponse.SUCCESS,
                         response, physical_id)
    except Exception as e:
        logger.exception(f"Exception: {e}")

        cfnresponse.send(event, context, cfnresponse.FAILED, {}, physical_id)


def get_database_engine(secret_name: str, database_name: str = '') -> Engine:
    engine_name, server_name, port, username, password = get_rds_creds(
        secret_name=secret_name
    )
    engine = create_engine(
        '%s://%s:%s@%s:%s/%s' %
        (engine_name, username, password, server_name, port, database_name),
        isolation_level='AUTOCOMMIT',
        echo=IS_VERBOSE
    )
    return engine


def handle_create_request(engine: Engine, database_name: str):
    with engine.connect() as conn:
        conn.execute(f"CREATE DATABASE IF NOT EXISTS {database_name}")

    return {
    }


def handle_delete_request(engine: Engine, database_name: str):
    with engine.connect() as conn:
        conn.execute(f"DROP DATABASE IF EXISTS {database_name}")

    return {
    }


def handle_update_request(engine: Engine, database_name: str,  old_engine: Engine, old_database_name: str):
    handle_create_request(engine, database_name)
    inspector = inspect(old_engine)
    existing_table_names = inspector.get_table_names()
    with engine.connect() as conn:
        for table_name in existing_table_names:
            conn.execute(
                f"RENAME TABLE {old_database_name}.{table_name} TO {database_name}.{table_name}")

    handle_delete_request(old_engine, old_database_name)

    return {
    }


def get_rds_creds(secret_name: str):
    client = boto3.client('secretsmanager')
    secret_response = client.get_secret_value(
        SecretId=secret_name
    )
    secret = json.loads(secret_response['SecretString'])

    engine = secret['engine']
    host = secret['host']
    port = int(secret['port'])
    username = secret['username']
    password = secret['password']

    if engine == 'mysql':
        engine = 'mysql+pymysql'

    return engine, host, port, username, password
