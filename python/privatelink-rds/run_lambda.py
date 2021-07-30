import boto3
import sys

client = boto3.client('lambda')

response = client.invoke(
    FunctionName = sys.argv[1]
)