import json
import os
import boto3
import logging
import pymysql

conn = None

logging.getLogger().setLevel(logging.INFO)

secret_arn = os.environ['SECRET_ARN']
db_name = os.environ['DB_NAME']
table_name = 'Vehicles'

def openDbConnection():
    global conn
    sm_client = boto3.client('secretsmanager')
    try:
    	get_secret_value_response = sm_client.get_secret_value(
    		SecretId=secret_arn
    	)
    except Exception as e:
        logging.exception(e)
    
    db_details = json.loads(get_secret_value_response['SecretString'])

    try:
        conn = pymysql.connect(
                db_details['host'], user=db_details['username'], passwd=db_details['password'], db=db_name, connect_timeout=5, cursorclass=pymysql.cursors.DictCursor)
    except Exception as e:
        logging.error("Unable to connect to RDS instance.")
        logging.exception(e)

def main(event, context):
    try:
        openDbConnection()
        with conn.cursor() as cur:
            cur.execute("select * from %s" %table_name)
            response = {
                "isBase64Encoded": False,
                "statusCode": 200,
                "body": "%s" % cur.fetchall(),
                "headers": {
                    'Content-Type': 'application/json',
                }
            }            
            print(response)
        
    except Exception as e:
        logging.exception(e)
    finally:
        if(conn is not None and conn.open):
            conn.close()
    return response
