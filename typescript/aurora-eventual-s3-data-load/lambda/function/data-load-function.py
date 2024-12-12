import boto3
import json
import os
import pymysql
import sys
from aws_lambda_powertools import Logger

logger = Logger(level="INFO", log_uncaught_exceptions=True)

#  Loading database credentials from Secrets Manager
secrets_manager = boto3.client('secretsmanager')
secret = json.loads(secrets_manager.get_secret_value(SecretId=os.environ['SECRETS_ID'])['SecretString'])

try:
    logger.info("Connecting to the database...")

    #  Establishing connection to the database
    conn = pymysql.connect(host=str(secret['host']),
                           user=str(secret['username']),
                           passwd=str(secret['password']),
                           db=str(secret['dbname']),
                           connect_timeout=15)

    #  Creating a cursor object
    cursor = conn.cursor()

except pymysql.MySQLError as e:
    logger.error({
        "description": "ERROR: Unexpected error: Could not connect to MySQL instance.",
        "error": e
    })
    sys.exit(1)

logger.info("SUCCESS: Connection to RDS for MySQL instance succeeded")


#  Capturing the SQS MessageId attribute and defining it as the log's CorrelationID
@logger.inject_lambda_context(correlation_id_path="Records[0].messageId")
def handler(event, context):
    try:
        #  Retrieving the S3 object path from the SQS message
        message = json.loads(event['Records'][0]['body'])
        s3 = message['Records'][0]['s3']
        bucket_object = "s3://" + s3['bucket']['name'] + "/" + s3['object']['key'] + ""

        logger.debug("Object to fetch: " + bucket_object)

        #  Starting the DB transaction
        conn.begin()

        #  Creating the table if it doesn't exist
        logger.info("Creating the table if it doesn't exist")

        create_table_statement = (
            "CREATE TABLE IF NOT EXISTS test (id int primary key auto_increment not null, description varchar(40) not null)")
        logger.debug(create_table_statement)
        cursor.execute(create_table_statement)

        logger.info("Table created successfully")

        #  Loading data from S3 into the table
        logger.info("Loading data from S3 into the table")

        load_statement = ("LOAD DATA "
                          "FROM S3 '" + bucket_object + "' "
                                                        "REPLACE "
                                                        "INTO TABLE test "
                                                        "FIELDS TERMINATED BY ';' "
                                                        "LINES TERMINATED BY '\n';")
        logger.debug(load_statement)
        cursor.execute(load_statement)

        logger.info("Data loaded successfully")

        affected_rows = conn.affected_rows()

        logger.info("Affected rolls: " + str(affected_rows))

        warnings = conn.show_warnings()

        logger.info("Warnings: " + str(warnings))

        if len(warnings) > 0:
            #  Raising a warning exception in case of any warnings
            raise pymysql.Warning(warnings)

        #  Committing the transaction
        conn.commit()

        logger.info("Load process executed successfully")

    except pymysql.Warning as e:
        conn.rollback()

        message = "There were warning alerts during LOAD process. Transaction rollback"
        logger.error({
            "description": message,
            "warnings": e
        })

        #  Re-raise the exception to propagate it further
        raise Exception(message)

    except pymysql.MySQLError as e:
        conn.rollback()

        message = "There were errors during LOAD process. Transaction rollback"
        logger.error({
            "description": message,
            "error": e
        })

        #  Re-raise the exception to propagate it further
        raise Exception(message)

    return "Load process executed successfully"
