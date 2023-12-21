# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

from pyflink.table import EnvironmentSettings, StreamTableEnvironment, StatementSet
import os
import json

env_settings = EnvironmentSettings.new_instance().in_streaming_mode().use_blink_planner().build()
table_env = StreamTableEnvironment.create(environment_settings=env_settings)
statement_set = table_env.create_statement_set()


def create_table_input(table_name, stream_name, broker):
    return """ CREATE TABLE {0} (
                `sensor_id` VARCHAR(64) NOT NULL,
                `temperature` BIGINT NOT NULL,
                `event_time` TIMESTAMP(3),
                WATERMARK FOR event_time AS event_time - INTERVAL '5' SECOND
              )
              WITH (
                'connector' = 'kafka',
                'topic' = '{1}',
                'properties.bootstrap.servers' = '{2}',
                'properties.group.id' = 'testGroup',
                'format' = 'json',
                'json.timestamp-format.standard' = 'ISO-8601',
                'scan.startup.mode' = 'earliest-offset'
              ) """.format(table_name, stream_name, broker)


def create_table_output_kafka(table_name, stream_name, broker):
    return """ CREATE TABLE {0} (
                `sensor_id` VARCHAR(64) NOT NULL,
                `count_temp` BIGINT NOT NULL ,
                `start_event_time` TIMESTAMP(3)
              )
              WITH (
                'connector' = 'kafka',
                'topic' = '{1}',
                'properties.bootstrap.servers' = '{2}',
                'properties.group.id' = 'testGroup',
                'format' = 'json',
                'json.timestamp-format.standard' = 'ISO-8601',
                'scan.startup.mode' = 'earliest-offset'
              ) """.format(table_name, stream_name, broker)


def create_table_output_s3(table_name, stream_name):
    return """ CREATE TABLE {0} (
                `sensor_id` VARCHAR(64) NOT NULL,
                `avg_temp` BIGINT NOT NULL ,
                `start_event_time` TIMESTAMP(3),
                `year` BIGINT,
                `month` BIGINT,
                `day` BIGINT,
                `hour` BIGINT
              )
              PARTITIONED BY (`year`,`month`,`day`,`hour`)
              WITH (
                'connector' = 'filesystem',
                'path' = 's3a://{1}/',
                'format' = 'json',
                'sink.partition-commit.policy.kind'='success-file',
                'sink.partition-commit.delay' = '1 min'
              ) """.format(table_name, stream_name)


def insert_stream_sns(insert_from, insert_into):
    return """ INSERT INTO {1} 
              SELECT sensor_id, count(*),
              TUMBLE_START(event_time, INTERVAL '30' SECOND )  
              FROM {0}
              where temperature > 30
              GROUP BY TUMBLE(event_time, INTERVAL '30' SECOND ),sensor_id 
              HAVING count(*) > 3 """.format(insert_from, insert_into)



def insert_stream_s3(insert_from, insert_into):
    return """INSERT INTO {1}
              SELECT *, YEAR(start_event_time), MONTH(start_event_time), DAYOFMONTH(start_event_time), HOUR(start_event_time)
              FROM
              (SELECT sensor_id, AVG(temperature) as avg_temp, TUMBLE_START(event_time, INTERVAL '60' SECOND ) as start_event_time
              FROM {0} 
              GROUP BY TUMBLE(event_time, INTERVAL '60' SECOND ), sensor_id) """.format(insert_from, insert_into)


def app_properties():
    file_path = '/etc/flink/application_properties.json'
    if os.path.isfile(file_path):
        with open(file_path, 'r') as file:
            contents = file.read()
            print('Contents of ' + file_path)
            print(contents)
            properties = json.loads(contents)
            return properties
    else:
        print('A file at "{}" was not found'.format(file_path))


def property_map(props, property_group_id):
    for prop in props:
        if prop["PropertyGroupId"] == property_group_id:
            return prop["PropertyMap"]


def main():
    INPUT_PROPERTY_GROUP_KEY = "producer.config.0"
    CONSUMER_PROPERTY_GROUP_KEY = "consumer.config.0"

    INPUT_TOPIC_KEY = "input.topic.name"
    OUTPUT_TOPIC_KEY = "output.topic.name"
    OUTPUT_BUCKET_KEY = "output.s3.bucket"
    BROKER_KEY = "bootstrap.servers"

    props = app_properties()

    input_property_map = property_map(props, INPUT_PROPERTY_GROUP_KEY)
    output_property_map = property_map(props, CONSUMER_PROPERTY_GROUP_KEY)

    input_stream = input_property_map[INPUT_TOPIC_KEY]
    broker = input_property_map[BROKER_KEY]

    output_stream_sns = output_property_map[OUTPUT_TOPIC_KEY]
    output_s3_bucket = output_property_map[OUTPUT_BUCKET_KEY]

    input_table = "input_table"
    output_table_sns = "output_table_sns"
    output_table_s3 = "output_table_s3"

    table_env.execute_sql(create_table_input(input_table, input_stream, broker))
    table_env.execute_sql(create_table_output_kafka(output_table_sns, output_stream_sns, broker))
    table_env.execute_sql(create_table_output_s3(output_table_s3, output_s3_bucket))

    statement_set.add_insert_sql(insert_stream_sns(input_table, output_table_sns))
    statement_set.add_insert_sql(insert_stream_s3(input_table, output_table_s3))

    statement_set.execute()


if __name__ == '__main__':
    main()
