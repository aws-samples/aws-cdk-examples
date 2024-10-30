import boto3
from datetime import datetime, timedelta
import logging

# Establish logging configuration
logger = logging.getLogger()

def lambda_handler(event, context):
    
    response = {
        
        'response': "the current date is " + datetime.now().strftime("%m-%d-%Y")
    }

    logger.info(response)
    
    return {
        'statusCode': 200,
        'body': response
    }