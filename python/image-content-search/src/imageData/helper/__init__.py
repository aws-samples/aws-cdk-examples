import boto3
import botocore.config
import logging
import os

cluster_arn = os.getenv('CLUSTER_ARN')
credentials_arn = os.getenv('CREDENTIALS_ARN')
db_name = os.getenv('DB_NAME')

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

rds_client = boto3.client('rds-data', config=aws_config)

def execute_statement(sql, sql_parameters = []):
    response = rds_client.execute_statement(
        secretArn=credentials_arn,
        database=db_name,
        resourceArn=cluster_arn,
        sql=sql,
        parameters=sql_parameters
    )
    return response

def batch_execute_statement(sql, sql_parameter_sets):
    response = rds_client.batch_execute_statement(
        secretArn=credentials_arn,
        database=db_name,
        resourceArn=cluster_arn,
        sql=sql,
        parameterSets=sql_parameter_sets
    )
    return response
