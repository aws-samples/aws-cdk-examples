import json
import requests
import argparse
from aws_requests_auth.boto_utils import BotoAWSRequestsAuth

RESOURCE = "stage_info"

def test_prod_api(apiurl, region):
    stage = "prod"
    auth = BotoAWSRequestsAuth(aws_host=apiurl, aws_region=region, aws_service='execute-api')
    res = requests.get(f"https://{apiurl}/{stage}/{RESOURCE}", timeout=2, auth=auth)
    res_body = json.loads(res.text)

    assert res.status_code == 200
    assert res_body['apiStage'] == stage
    assert res_body['lambdaAlias'] == stage

def test_dev_api(apiurl, region):
    stage = "dev"
    auth = BotoAWSRequestsAuth(aws_host=apiurl, aws_region=region, aws_service='execute-api')
    res = requests.get(f"https://{apiurl}/{stage}/{RESOURCE}", timeout=2, auth=auth)
    res_body = json.loads(res.text)

    assert res.status_code == 200
    assert res_body['apiStage'] == stage
    assert res_body['lambdaAlias'] == stage

def test_test_api(apiurl, region):
    stage = "test"
    auth = BotoAWSRequestsAuth(aws_host=apiurl, aws_region=region, aws_service='execute-api')
    res = requests.get(f"https://{apiurl}/{stage}/{RESOURCE}", timeout=2, auth=auth)
    res_body = json.loads(res.text)

    assert res.status_code == 200
    assert res_body['apiStage'] == stage
    assert res_body['lambdaAlias'] == stage

