import json
import os
import boto3
import datetime

class GenomicsProject:
    init_str = "{\"TaskInfo\":{\"BasicParameters\":{\"ProjectNo\":\"HelloCDK\",\"INPUT_BUCKET\":\"s3bucket\",\"INPUT_KEY\":\"input.tsv\",\"OUTPUT_BUCKET\":\"s3bucket\",\"wait_time\":5},\"JobParameter\":{\"String_Split\":{\"Name\":\"String_Split\",\"OUTPUT_KEY\":\"result/HelloCDK/String_Split\",\"SPLIT_NUM\":\"30000\"},\"String_Reverse\":{\"Name\":\"String_Reverse\",\"OUTPUT_KEY\":\"result/HelloCDK/String_Reverse\",\"Prefix\":\"reverse\"},\"String_Repeat\":{\"Name\":\"String_Repeat\",\"OUTPUT_KEY\":\"result/HelloCDK/String_Repeat\",\"Prefix\":\"repeat\"}}}}"
    project = json.loads(init_str)
    def invokeSF(self):
        client = boto3.client('stepfunctions')
        response = client.start_execution(
            stateMachineArn = os.environ['StatemachineArn'],
            input = json.dumps(self.project)
        )
        return response
        
    def setproject(self,ProjectNo,INPUT_BUCKET,INPUT_KEY,OUTPUT_BUCKET,SPLIT_NUM):
        self.project['TaskInfo']['BasicParameters']['ProjectNo'] = ProjectNo
        self.project['TaskInfo']['BasicParameters']['INPUT_BUCKET'] = INPUT_BUCKET
        self.project['TaskInfo']['BasicParameters']['INPUT_KEY'] = INPUT_KEY
        self.project['TaskInfo']['BasicParameters']['OUTPUT_BUCKET'] = OUTPUT_BUCKET
        self.project['TaskInfo']['JobParameter']['String_Split']['SPLIT_NUM'] = SPLIT_NUM
        for func in self.project['TaskInfo']['JobParameter'].keys():
            self.project['TaskInfo']['JobParameter'][func]['OUTPUT_KEY'] = 'result/' + ProjectNo + '/' + func


    
def handler(event, context):
    x = GenomicsProject()
    apibody = json.loads(event['body'])
    try:
        x.setproject(apibody['ProjectNo'],apibody['INPUT_BUCKET'],apibody['INPUT_KEY'],apibody['OUTPUT_BUCKET'],apibody['SPLIT_NUM'])
        sfn_response = x.invokeSF()
        return {
            'statusCode': 200,
            'body': str(sfn_response)
        }
    
    except Exception as e: 
        return {
            'statusCode': 400,
            'body': 'Error:' + str(e)
        }