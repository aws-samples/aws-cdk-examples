################################################################################
########### Bellow is the block you should use for local test        ###########
################################################################################
# %iam_role arn:aws:iam::987624884591:role/glue-full-s3-permissions
# %number_of_workers 2
# %worker_type G.1X
# %idle_timeout 120
#
# sys.argv += ['--JOB_NAME', 'my_test_job']
# sys.argv += ['--target_datetime', '2024-07-09T14:33:00.000Z']
#
# sys.argv += ['--raw_database_name', 'demo-raw-data']
# sys.argv += ['--aggregated_database_name', 'demo-aggregated-data']
#
# sys.argv += ['--raw_data_table_name', 'raw_data']
#
# sys.argv += ['--hits_by_domain_and_group_id_table_name', 'hits_by_domain_and_groupid']
# sys.argv += ['--hits_by_domain_and_group_id_table_location',
#              's3://demo-glue-scheduled-aggregators-987624884591/aggregated_data/hits_by_domain_and_groupid/']
#
# sys.argv += ['--hits_by_user_agent_table_name', 'hits_by_useragent']
# sys.argv += ['--hits_by_user_agent_table_location',
#              's3://demo-glue-scheduled-aggregators-987624884591/aggregated_data/hits_by_useragent/']
#
# sys.argv += ['--hits_by_country_table_name', 'hits_by_country']
# sys.argv += ['--hits_by_country_table_location',
#              's3://demo-glue-scheduled-aggregators-987624884591/aggregated_data/hits_by_country/']
################################################################################

import re
import sys
from awsglue import DynamicFrame
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from pyspark.sql import DataFrame
from pyspark.sql.functions import count

# RegEx expression to decompose the date (ISO format) into different fields.
expression = re.compile(r'^(?P<year>\d{4})-(?P<month>\d{2})-(?P<day>\d{2}).(?P<hour>\d{2}).*')

# Selecting the input arguments the script will work with
args = getResolvedOptions(sys.argv, [
    'target_datetime',
    'raw_database_name',
    'aggregated_database_name',
    'raw_data_table_name',
    'hits_by_domain_and_group_id_table_name',
    'hits_by_domain_and_group_id_table_location',
    'hits_by_user_agent_table_name',
    'hits_by_user_agent_table_location',
    'hits_by_country_table_name',
    'hits_by_country_table_location'
])

# target_datetime field decomposition
date_time = expression.search(args["target_datetime"]).groupdict()

year = date_time["year"]
month = date_time["month"]
day = date_time["day"]
hour = date_time["hour"]

# Glue and Spark context creation
glueContext = GlueContext(SparkContext.getOrCreate())
spark = glueContext.spark_session
job = Job(glueContext)
job.init(job_name='JOB')


def aggregate_by_domain_and_groupid(df):
    # Aggregation process
    hits_by_domain_and_groupid = (df
                                  .groupBy('Domain', 'GroupID', 'year', 'month', 'day', 'hour')
                                  .agg(count("*").alias("hitCount"))
                                  .orderBy('Domain', 'GroupID'))

    # Creating the Glue DynamicFrame to be writen
    final_df = DynamicFrame.fromDF(dataframe=hits_by_domain_and_groupid, glue_ctx=glueContext, name="finalDF")
    print(f'Items aggregated by Domain and GroupID: {final_df.count()}')

    # Configuring the data destination
    hits_sink = glueContext.getSink(
        connection_type="s3",
        path=args["hits_by_domain_and_group_id_table_location"],
        updateBehavior="UPDATE_IN_DATABASE",
        partitionKeys=['year', 'month', 'day', 'hour'],
        compression="snappy",
        enableUpdateCatalog=True,
    )
    hits_sink.setFormat("json")
    hits_sink.setCatalogInfo(catalogDatabase=args["aggregated_database_name"],
                             catalogTableName=args["hits_by_domain_and_group_id_table_name"])

    # Writing the data to the catalog
    hits_sink.writeFrame(final_df)


def aggregate_by_country(df):
    # Aggregation process
    hits_by_country = (df
                       .groupBy('CountryCode', 'year', 'month', 'day', 'hour')
                       .agg(count("*").alias("hitCount"))
                       .orderBy('CountryCode'))

    # Creating the Glue DynamicFrame to be writen
    final_df = DynamicFrame.fromDF(dataframe=hits_by_country, glue_ctx=glueContext, name="finalDF")
    print(f'Items aggregated by CountryCode: {final_df.count()}')

    # Configuring the data destination
    hits_sink = glueContext.getSink(
        connection_type="s3",
        path=args["hits_by_country_table_location"],
        updateBehavior="UPDATE_IN_DATABASE",
        partitionKeys=['year', 'month', 'day', 'hour'],
        compression="snappy",
        enableUpdateCatalog=True,
    )
    hits_sink.setFormat("glueparquet")
    hits_sink.setCatalogInfo(catalogDatabase=args["aggregated_database_name"],
                             catalogTableName=args["hits_by_country_table_name"])

    # Writing the data to the catalog
    hits_sink.writeFrame(final_df)


def aggregate_by_useragent(df):
    # Aggregation process
    hits_by_useragent = (df
                         .groupBy('UserAgent', 'year', 'month', 'day', 'hour')
                         .agg(count("*").alias("hitCount"))
                         .orderBy('UserAgent'))

    # Creating the Glue DynamicFrame to be writen
    final_df = DynamicFrame.fromDF(dataframe=hits_by_useragent, glue_ctx=glueContext, name="finalDF")
    print(f'Items aggregated by UserAgent: {final_df.count()}')

    # Configuring the data destination
    hits_sink = glueContext.getSink(
        connection_type="s3",
        path=args["hits_by_user_agent_table_location"],
        updateBehavior="UPDATE_IN_DATABASE",
        partitionKeys=['year', 'month', 'day', 'hour'],
        compression="snappy",
        enableUpdateCatalog=True,
    )
    hits_sink.setFormat("glueparquet")
    hits_sink.setCatalogInfo(catalogDatabase=args["aggregated_database_name"],
                             catalogTableName=args["hits_by_user_agent_table_name"])

    # Writing the data to the catalog
    hits_sink.writeFrame(final_df)


# Creating a Glue DynamicFrame from the catalog data and partition of specified date time
hits: DynamicFrame = glueContext.create_dynamic_frame.from_catalog(database=args["raw_database_name"],
                                                                   table_name=args["raw_data_table_name"],
                                                                   push_down_predicate=f"year='{year}' and month='{month}' and day='{day}' and hour='{hour}'")

# Creating a Spark DataFrame and keeping it in cache
hits: DataFrame = hits.toDF().cache()

# Print the total of items to be processed
print(f'Total items to be aggregated: {hits.count()}')

# If there is any record to be processed, start the three aggregation processes
if not hits.isEmpty():
    aggregate_by_domain_and_groupid(hits)
    aggregate_by_country(hits)
    aggregate_by_useragent(hits)

# Commits the Glue Job
job.commit()
