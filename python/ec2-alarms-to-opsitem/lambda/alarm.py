import json
import boto3
import time
import os
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handler(event, context): 
    logger.info(event)
    alarm_action_str = 'arn:aws:sns:' + os.environ['region'] + ':' + os.environ['acct'] + ':' + os.environ['topic']
    instanceid = event['detail']['instance-id']
    
    ec2 = boto3.client('ec2')
    
    try:
        response = ec2.describe_instances(
            Filters=[
            {
                'Name': 'tag:OpsItemAlarm',
                'Values': ['false',]
            },
            ],
            InstanceIds=[instanceid],
            DryRun=False
        )
    except:
        logger.info("Exception")
    
    logger.info(response)    

    contflag = len(response['Reservations'])
    if contflag == 0:
        print("No instance found or already properly tagged: " + instanceid)
    else:
        print(response['Reservations'])
        cloudwatch = boto3.client('cloudwatch')
        response = cloudwatch.put_metric_alarm(
            AlarmName= 'StatusCheckFailed' + '-' + instanceid,
            ComparisonOperator="GreaterThanThreshold",
            EvaluationPeriods=1,
            TreatMissingData="notBreaching",
            MetricName="StatusCheckFailed",
            Namespace="AWS/EC2",
            Period=300,
            Statistic="Average",
            Threshold=1.0,
            ActionsEnabled=True,
            AlarmActions=[alarm_action_str],
            AlarmDescription='Alarm Ec2 StatusCheckFails',
            Dimensions=[{
                'Name': "InstanceId",
                'Value': instanceid},],
                Unit='Seconds'
        )
        response = ec2.create_tags(
            Resources=[instanceid],
            Tags=[
                {
                    'Key': 'OpsItemAlarm',
                    'Value': 'Yes',
                },
            ]
        )
        print("Tag Updated for instance: " + instanceid)