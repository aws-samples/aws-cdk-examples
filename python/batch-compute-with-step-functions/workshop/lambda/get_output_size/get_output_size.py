import json
import os
import boto3
import datetime

def handler(event, context):
    timenow = (datetime.datetime.now()+datetime.timedelta(hours=8)).strftime('%Y-%m-%d')
    event["JobStatus"] = {
        "OutputStatus":"SUCCEEDED",
        "Job_Comment":
            '''
Time:{Time}
INPUT_FILE:{INPUT_BUCKET}/{INPUT_KEY}
OUTPUT_DIR: {OUTPUT_BUCKET}/{OUTPUT_KEY}
            '''.format(
                    Time=str(timenow),
                    INPUT_BUCKET=event["BasicParameters"]["INPUT_BUCKET"],
                    INPUT_KEY=event["BasicParameters"]["INPUT_KEY"],
                    OUTPUT_BUCKET=event["BasicParameters"]["OUTPUT_BUCKET"],
                    OUTPUT_KEY='/'.join(event["JobParameter"]['String_Split']['OUTPUT_KEY'].split('/')[0:-1])
                ),
        "SNS_Subject":"Job Success:" + event["BasicParameters"]["ProjectNo"]}
    return {"TaskInfo":event}