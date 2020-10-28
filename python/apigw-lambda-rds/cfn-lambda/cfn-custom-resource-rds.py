import json
import os
import boto3
import cfnresponse
import logging 
import pymysql

conn = None

logging.getLogger().setLevel(logging.INFO)

secret_arn = os.environ['SECRET_ARN']
db_name = os.environ['DB_NAME']

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
                db_details['host'], user=db_details['username'], passwd=db_details['password'], db=db_name, connect_timeout=5)
    except Exception as e:
        logging.error("Unable to connect to RDS instance.")
        logging.exception(e)

def main(event, context):
    cfn_physical_id = 'DBInitialiseCustomResource'
    try:
        openDbConnection()
        with conn.cursor() as cur:
            cur.execute(
                "Create Table if not exists Vehicles (VehicleID int AUTO_INCREMENT Primary Key, VehicleType varchar(50), VehicleCapacity int)")
            cur.execute(
                "Insert into Vehicles (VehicleID, VehicleType, VehicleCapacity) Values (null, \"Economy\", 4)")
            cur.execute(
                "Insert into Vehicles (VehicleID, VehicleType, VehicleCapacity) Values (null, \"Standard\", 4)")
            cur.execute(
                "Insert into Vehicles (VehicleID, VehicleType, VehicleCapacity) Values (null, \"Premium\", 4)")
            cur.execute(
                "Insert into Vehicles (VehicleID, VehicleType, VehicleCapacity) Values (null, \"Minivan\", 8)")
            conn.commit()
            print ('Created table Vehicles and inserted 4 rows.')
    except Exception as e:
        logging.exception(e)
        cfnresponse.send(event, context, cfnresponse.FAILED, {}, cfn_physical_id)
    finally:
        if(conn is not None and conn.open):
            conn.close()
        cfnresponse.send(event, context, cfnresponse.SUCCESS, {'Response':'DB Initialised'}, cfn_physical_id)
    return True
