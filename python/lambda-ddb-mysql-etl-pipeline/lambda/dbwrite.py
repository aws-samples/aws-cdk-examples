import json
import os
import decimal
import mimetypes
import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)

ddb = boto3.resource('dynamodb')
s3 = boto3.client('s3')
ddb_table = ddb.Table(os.environ['ASTEROIDS_TABLE'])
_lambda = boto3.client('lambda')

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
        A call to write_to_mysql() will only print result to CloudWatch Logs. It is only
        meant to show an example of how one might dynamically process similar records in MySQL.
        Amongst other things, this requires a Pandas layer and it should either be written
        as a class or modularized and managed via additional event triggers or stepfunctions.
        This is more resource heavy and specific but including to show options. Remove
        comments and tweak at your leisure. Don't forget that you'll need to first create
        the Pandas archive for the layer file for reference in the stack construct class.
        Use the included requests layer example as a baseline, if necessary.
        You need to import other necessary modules into this lambda as well. 
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
    """Gets table attributes from a given schema.

    Args:
         t_suffix (str): The table name suffix of the write target table.
    Returns:
        attribute_list (list): Array of column names in the specified db table.
    Notes:
        Not functional in CDK example for lack of time. See `handler.__doc__` above for further information.
    """
    return "`mysql_attrs` ref from `get_mysql_attrs()`"
    # secrets = get_secret()
    # stage = secrets['STAGE']
    # connection = pymysql.connect(host=secrets['MYSQL_ENDPOINT']
    #                              , port=3306
    #                              , user=secrets['MYSQL_USER']
    #                              , password=secrets['MYSQL_PASSWD']
    #                              , autocommit=True
    #                              )
    # cursor_obj = connection.cursor()
    # table_check = f"""
    #     SELECT
    #         COUNT(*)
    #     FROM information_schema.tables
    #     WHERE TABLE_SCHEMA = '{stage}'
    #     AND TABLE_NAME = 'table_{t_suffix}'
    #     """
    # cursor_obj.execute(table_check)
    # if cursor_obj.fetchone()[0] == 0:
    #     print('No table exists!!!')
    #     sns = boto3.client('sns')
    #     response = sns.publish(
    #         TopicArn=os.environ['TOPIC_ARN'],
    #         Message=f"""A new t_suffix has been detected. A new staging table has been created with
    #                 relevant tuples loaded to : {stage}.table_{t_suffix}"""
    #     )
    #
    #     create_table = f"""
    #     CREATE TABLE IF NOT EXISTS {stage}.table_{t_suffix} (
    #     id VARCHAR(7),
    #     `name` VARCHAR(12),
    #     created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    #     PRIMARY KEY (id),
    #     UNIQUE KEY comp_idx_id_name (id,`name`)
    #     )"""
    #     cursor_obj.execute(create_table)
    #
    #     get_attrs = f"""
    #     SELECT
    #     COLUMN_NAME
    #     FROM INFORMATION_SCHEMA.COLUMNS
    #     WHERE TABLE_SCHEMA = '{stage}' AND TABLE_NAME = 'table_{t_suffix}'
    #     """
    #     cursor_obj.execute(get_attrs)
    #
    #     return [column[0] for column in dwr_cursor.fetchall()]
    #
    # else:
    #     get_attrs = f"""
    #     SELECT
    #     COLUMN_NAME
    #     FROM INFORMATION_SCHEMA.COLUMNS
    #     WHERE TABLE_SCHEMA = '{stage}' AND TABLE_NAME = 'table_{t_suffix}'"""
    #     cursor_obj.execute(get_attrs)
    #     return [column[0] for column in cursor_obj.fetchall()]

def dynamic_mysql_crud_ops(ast_list, t_suffix, mysql_attrs):
    """Backs dataset attrs against table attrs then runs CRUD ops dynamically.

    Args:
         ast_list (str): String of s3 body data.
         t_suffix (str): The table name suffix of the write target table.
         mysql_attrs (list): Array of column names from the DB table in question.

    Notes:
        Not functional in CDK example for lack of time. It will only print result to CloudWatch Logs.
            See `handler.__doc__` above for further information.
    """
    print(f"Here are the values for ast_list, t_suffix, mysql_attrs in order: \n {ast_list}, {t_suffix}, {mysql_attrs})")
    # stage = secrets['STAGE']
    # # Setting header to None to trick Pandas as it ignores them otherwise
    # df_attrs = pandas.read_csv(ast_list.read()), sep='|', header=None, index_col=False, dtype=str, keep_default_na=False, nrows=1)
    # # Creates final tuple of attributes from dataframe attributes
    # final_attrs = [tuple(x) for x in df_attrs.values]
    # final_attrs = final_attrs[0]
    # # Extract rows from file and create tuples
    # df_tuples = pandas.read_csv(ast_list.read()), sep='|', na_values=None, keep_default_na=False, dtype=str)
    # df_tuples = df_tuples.apply(tuple, axis=1)
    #
    # # Compare dwr attrs against s3 attrs to determine ALTER statement requirement and run, if necessary
    # for attr in final_attrs:
    #     if attr in mysql_attrs:
    # print('No new attribute to record')
    # else:
    # print(attr)
    # alter_attr_statement = f"""
    #             ALTER TABLE {stage}.table_{t_suffix} ADD `{attr}` VARCHAR(50)
    #         """
    # cursor_obj.execute(alter_attr_statement)
    #
    # # Strip empty quotes in df_tuples, transform to 'None' and build final tuples array for INSERT
    # tuples_nullified = []
    # for tup in df_tuples:
    #     tuples_nullified.append((tuple(None if elem == '' else elem for elem in tup)))
    #
    # # Build dynamic attribute strings for INSERT
    # attr_str_insert = ""
    # attr_var_insert = ""
    # for attr in final_attrs:
    #     if attr != final_attrs[len(final_attrs) -1]:
    # attr_str_insert += "`"+attr+"`, "
    # attr_var_insert += "%s,"
    # else:
    # attr_str_insert += "`"+attr+"`"
    # attr_var_insert += "%s"
    #
    # # Dynamic Insert
    # replace_statement = f"""
    #     REPLACE INTO {stage}.table_{t_suffix}
    #     ({attr_str_insert}) VALUES ({attr_var_insert})
    #     """
    # cursor_obj.executemany(replace_statement, tuples_nullified)
    # print(cursor_obj.rowcount, f"Record(s) inserted successfully into table_{t_suffix}")