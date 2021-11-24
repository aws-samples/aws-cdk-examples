import json
import os
import decimal
import mimetypes
import boto3
import logging
import pymysql 
import pandas

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)

ddb = boto3.resource('dynamodb')
s3 = boto3.client('s3')
ddb_table = ddb.Table(os.environ['ASTEROIDS_TABLE'])
_lambda = boto3.client('lambda')
db_conn = None
SCHEMA = os.environ['SCHEMA']

def handler(event, context):
    """Retrieve s3 object and write to dynamo or mysql table(not-functional in this example, thus comments)

    Args:
        event (dict, list, str, int, float, NoneType): Provides event specific data to the handler. It
            can also be of type list, str, int, float, or NoneType.
        context (obj): Provides methods and properties that contain invocation, function and
            execution environment information.
    Raises:
        Exception: If file format is not of .json or .csv file types.

    Notes:
        A call to `write_to_mysql()` will require that you setup a DB Connection
        and set `db_conn` herein to `True`. Otherwise, the current example will
        only print results to CloudWatch Logs. Pandas & PyMySQL archives are
        included as layers in the project.
    """
    s3_key=event['Records'][0]['s3']['object']['key']
    stream_obj=s3.get_object(Bucket=os.environ['S3_BUCKET'], Key=s3_key)
    data = stream_obj['Body'].read().decode('utf-8')
    if mimetypes.guess_type(s3_key)[0] == "application/json":
        asteroid_list=json.loads(data, parse_float=decimal.Decimal)
        write_to_ddb(asteroid_list)
    elif mimetypes.guess_type(s3_key)[0] ==  "text/csv":
        write_to_mysql(data, 'asteroids')
    else:
        raise Exception("FILE FORMAT NOT RECOGNIZED")

def write_to_ddb(ast_list):
    """Puts/Writes each JSON record to DynamoDB.

    Args:
        ast_list (obj): A JSON list of objects that contain Asteroid data.
    """
    for index in ast_list:
        ddb_table.put_item(Item=index)

def write_to_mysql(ast_list, t_suffix):
    mysql_attrs=get_mysql_attrs(t_suffix)
    dynamic_mysql_crud_ops(ast_list, t_suffix, mysql_attrs)

def get_mysql_attrs(t_suffix):
    """Gets table attributes from Information Schema & creates new staging table, if necessary

    Args:
         t_suffix (str): The table name suffix of the write target table.
    Returns:
        attribute_list (list): Array of column names in the specified db table.
    """
    if db_conn is None:
        return "`mysql_attrs` ref from `get_mysql_attrs()`"
    else:
        # Gets DB Creds from AWS Secrets Manager
        try:
            session = boto3.session.Session()
            client = session.client(service_name='secretsmanager'
                , region_name=os.environ['REGION'])
            SECRET = client.get_secret_value(SecretId=os.environ['DB_SECRETS_REF'])
            if 'SecretString' in SECRET:
                SECRETS = json.loads(SECRET['SecretString'])
            else:
                SECRETS = json.loads(b64decode(SECRET['SecretBinary']))
        except Exception:
            logger.error("ERROR: Unable to GET DB Credentials from Secrets Manager")

        try:
            connection = pymysql.connect(host=SECRETS['MYSQL_ENDPOINT'], port=3306
                , user=SECRETS['MYSQL_USER'], password=SECRETS['MYSQL_PASSWD']
                , autocommit=True, connect_timeout=5)
        except pymysql.MySQLError:
            logger.error("MySQLError: MySQL Connection Issue")
        cursor_obj = connection.cursor()
        table_check = f"""
            SELECT
                COUNT(*)
            FROM information_schema.tables
            WHERE TABLE_SCHEMA = '{SCHEMA}'
            AND TABLE_NAME = 'table_{t_suffix}'
            """
        cursor_obj.execute(table_check)
        if cursor_obj.fetchone()[0] == 0:
            logger.info('No table exists!!!')
            sns = boto3.client('sns')
            response = sns.publish(
                TopicArn=os.environ['TOPIC_ARN'],
                Message=f"""A new t_suffix has been detected. A new staging table has been created with
                        relevant tuples loaded to : {SCHEMA}.table_{t_suffix}"""
            )
        
            create_table = f"""
            CREATE TABLE IF NOT EXISTS {SCHEMA}.table_{t_suffix} (
            id VARCHAR(7),
            `name` VARCHAR(12),
            created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            PRIMARY KEY (id),
            UNIQUE KEY comp_idx_id_name (id,`name`)
            )"""
            cursor_obj.execute(create_table)
        
            get_attrs = f"""
            SELECT
            COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = '{SCHEMA}' AND TABLE_NAME = 'table_{t_suffix}'
            """
            cursor_obj.execute(get_attrs)
        
            return [column[0] for column in dwr_cursor.fetchall()]
        
        else:
            get_attrs = f"""
            SELECT
            COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = '{SCHEMA}' AND TABLE_NAME = 'table_{t_suffix}'"""
            cursor_obj.execute(get_attrs)
            return [column[0] for column in cursor_obj.fetchall()]

def dynamic_mysql_crud_ops(ast_list, t_suffix, mysql_attrs):
    """Backs dataset attrs against table attrs then runs CRUD ops dynamically.

    Args:
         ast_list (str): String of s3 body data.
         t_suffix (str): The table name suffix of the write target table.
         mysql_attrs (list): Array of column names from the DB table in question.

    Notes:
        Prints results to CloudWatch Logs will work if one includes DB Credentials
        and removes `None` flag on `db_conn` herein.
    """
    if db_conn is None:
        logger.info(f"VALUES for ast_list, t_suffix, mysql_attrs respectively: \n {ast_list} | {t_suffix} | {mysql_attrs}")
        return {
        "asteroid_list":ast_list,
        "table_suffix":t_suffix,
        "table_attributes": mysql_attrs
        }
    else:
        # Setting header to None to trick Pandas as it ignores them otherwise
        df_attrs = pandas.read_csv(ast_list.read()), sep='|', header=None, index_col=False, dtype=str, keep_default_na=False, nrows=1)
        # Creates final tuple of attributes from dataframe attributes
        final_attrs = [tuple(x) for x in df_attrs.values]
        final_attrs = final_attrs[0]
        # Extract rows from file and create tuples
        df_tuples = pandas.read_csv(ast_list.read()), sep='|', na_values=None, keep_default_na=False, dtype=str)
        df_tuples = df_tuples.apply(tuple, axis=1)
        
        # Compare dwr attrs against s3 attrs to determine ALTER statement requirement and run, if necessary
        for attr in final_attrs:
            if attr in mysql_attrs:
            logger.info('No new attribute to record')
            else:
                logger.info(attr)
                alter_attr_statement = f"""
                    ALTER TABLE {SCHEMA}.table_{t_suffix} ADD `{attr}` VARCHAR(50)"""
                cursor_obj.execute(alter_attr_statement)
        
        # Strip empty quotes in df_tuples, transform to 'None' and build final tuples array for INSERT
        tuples_nullified = []
        for tup in df_tuples:
            tuples_nullified.append((tuple(None if elem == '' else elem for elem in tup)))
        
        # Build dynamic attribute strings for INSERT
        attr_str_insert = ""
        attr_var_insert = ""
        for attr in final_attrs:
            if attr != final_attrs[len(final_attrs) -1]:
        attr_str_insert += "`"+attr+"`, "
        attr_var_insert += "%s,"
        else:
        attr_str_insert += "`"+attr+"`"
        attr_var_insert += "%s"
        
        # Dynamic Insert
        replace_statement = f"""
            REPLACE INTO {SCHEMA}.table_{t_suffix}
            ({attr_str_insert}) VALUES ({attr_var_insert})"""
        cursor_obj.executemany(replace_statement, tuples_nullified)
        logger.info(cursor_obj.rowcount, f"Record(s) inserted successfully into table_{t_suffix}")

        return f"Record(s) inserted successfully into table_{t_suffix}"