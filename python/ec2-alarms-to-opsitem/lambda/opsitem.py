import json
import boto3
import os

def handler(event, context):
    sns_arn = 'arn:aws:sns:' + os.environ['region'] + ':' + os.environ['acct'] + ':' + os.environ['topic']
    ssm = boto3.client('ssm')
    desc = event['detail']['alarmName']
    source = 'EC2'
    title = event['detail-type']
    caller = context.invoked_function_arn
    response = ssm.create_ops_item(
        Description=desc,
        OperationalData={
        '/aws/automations': {
            "Value":"[{\"automationId\": \"AWS-RestartEC2Instance\", \"automationType\": \"AWS::SSM::Automation\"}]",
            "Type": "SearchableString"
            },
        '/aws/dedup': {
            "Type": "SearchableString",
            "Value":"{\"dedupString\":\"" + desc + "\"}"
            }
        },
        Notifications=[
        {
            'Arn': sns_arn
        },
        ],
        Priority=3,
        RelatedOpsItems=[
        {
            'OpsItemId': 'oi-cebfda3fb3ec'
        },
        ],
        Source=source,
        Title=title,
        Tags=[
        {
            'Key': 'Source',
            'Value': caller
        },
        ],
        Category='Availability',
        Severity='2',
    )
    print(response)