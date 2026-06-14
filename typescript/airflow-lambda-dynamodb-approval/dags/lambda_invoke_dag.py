"""DAG demonstrating Lambda invocation from Airflow using boto3."""
import json
from datetime import datetime

import boto3
import pendulum
from airflow.decorators import dag, task

DEMO_FUNCTION_NAME = "MwaaApprovalWorkflowStack-DemoFunction"


@dag(
    dag_id="lambda_invoke",
    start_date=pendulum.datetime(2024, 1, 1),
    schedule=None,
    catchup=False,
    tags=["lambda", "demo"],
    description="Invoke a Lambda function from Airflow and process the response",
)
def lambda_invoke_dag():
    @task
    def invoke_lambda():
        client = boto3.client("lambda")
        # Find the demo function by prefix (CDK adds a suffix)
        paginator = client.get_paginator("list_functions")
        function_name = None
        for page in paginator.paginate():
            for fn in page["Functions"]:
                if fn["FunctionName"].startswith(DEMO_FUNCTION_NAME):
                    function_name = fn["FunctionName"]
                    break
            if function_name:
                break

        if not function_name:
            raise RuntimeError(f"No function found with prefix {DEMO_FUNCTION_NAME}")

        payload = {
            "message": "Hello from Airflow!",
            "timestamp": datetime.now().isoformat(),
        }

        response = client.invoke(
            FunctionName=function_name,
            InvocationType="RequestResponse",
            Payload=json.dumps(payload),
        )
        result = json.loads(response["Payload"].read())
        print(f"Lambda response: {json.dumps(result, indent=2)}")
        return result

    @task
    def process_result(result: dict):
        body = json.loads(result.get("body", "{}"))
        print(f"Lambda processed at: {body.get('processed_at')}")
        print(f"Request ID: {body.get('request_id')}")
        return body

    result = invoke_lambda()
    process_result(result)


lambda_invoke_dag()
