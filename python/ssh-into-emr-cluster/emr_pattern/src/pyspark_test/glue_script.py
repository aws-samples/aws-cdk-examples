from pyspark.sql import SparkSession
import sys

spark = SparkSession.builder.appName('emr_cdk_pattern_app').getOrCreate()

bucket_name = sys.argv[1]

df = spark.read.csv(f's3://{bucket_name}/pyspark_test/test_data.csv')

df.write.parquet(f's3://{bucket_name}/output/')