from flask import Flask, render_template, request
from awsrequests import AwsRequester
import json
import requests
import os

class DateEncoder(json.JSONEncoder ):  
    def default(self, obj):  
        if isinstance(obj, bytes):  
            return obj.__str__()  
        return json.JSONEncoder.default(self, obj)


APIGateway_URL = os.getenv("APIGatewayURL")
app = Flask(__name__)
@app.route('/')
def main_page():
  return render_template('form.html')


@app.route('/upload', methods = ['GET', 'POST'])
def upload():
    if request.method == 'POST':
        submit_info = {
            "ProjectNo" : request.form.get('ProjectNo'),
            "INPUT_BUCKET" : request.form.get('INPUT_BUCKET'),
            "INPUT_KEY" : request.form.get('INPUT_KEY'),
            "OUTPUT_BUCKET" : request.form.get('OUTPUT_BUCKET'),
            "SPLIT_NUM" : request.form.get('SPLIT_NUM')
        }
        print(submit_info)
        return {
            'statusCode': 200,
            'body': "任务已提交成功:"+ str(requests.post(APIGateway_URL,json.dumps(submit_info,cls=DateEncoder)).content)
        }

if __name__ == '__main__':
    app.run(debug = True, host="0.0.0.0", port=80)
