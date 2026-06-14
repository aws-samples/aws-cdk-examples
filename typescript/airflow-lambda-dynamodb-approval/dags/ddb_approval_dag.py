"""DAG demonstrating a human approval workflow using DynamoDB.

Flow:
  1. Creates a PENDING approval request in DynamoDB
  2. Sensors poll until approval_status is changed to APPROVED
  3. After approval, processes the request

To approve: update the item in DynamoDB and set approval_status = "APPROVED".
"""
import json
from datetime import datetime

import boto3
import pendulum
from airflow.decorators import dag, task
from airflow.providers.amazon.aws.sensors.dynamodb import DynamoDBValueSensor

# The table name is output by the CDK stack. Update this if you customized it.
APPROVAL_TABLE = "MwaaApprovalWorkflowStack"


def _get_table_name() -> str:
    """Resolve the approval table by CDK stack output prefix."""
    dynamodb = boto3.client("dynamodb")
    paginator = dynamodb.get_paginator("list_tables")
    for page in paginator.paginate():
        for name in page["TableNames"]:
            if name.startswith(APPROVAL_TABLE):
                return name
    raise RuntimeError(f"No DynamoDB table found with prefix {APPROVAL_TABLE}")


@dag(
    dag_id="ddb_approval_workflow",
    start_date=pendulum.datetime(2024, 1, 1),
    schedule=None,
    catchup=False,
    tags=["dynamodb", "approval", "demo"],
    description="Human approval workflow - waits for APPROVED status in DynamoDB",
)
def ddb_approval_dag():
    @task
    def create_approval_request(**context):
        """Insert a PENDING approval request into DynamoDB."""
        table_name = _get_table_name()
        process_id = context["dag_run"].run_id

        item = {
            "id": process_id,
            "requester": "airflow-demo",
            "amount": 25000,
            "reason": "Quarterly budget allocation",
            "approval_status": "PENDING",
            "created_at": datetime.now().isoformat(),
        }

        dynamodb = boto3.resource("dynamodb")
        table = dynamodb.Table(table_name)
        table.put_item(Item=item)

        print(f"Created approval request: {process_id}")
        print(f"Table: {table_name}")
        print("To approve: set approval_status to APPROVED in DynamoDB console")
        return {"process_id": process_id, "table_name": table_name}

    @task
    def process_approved(**context):
        """Process the request after human approval."""
        table_name = _get_table_name()
        process_id = context["dag_run"].run_id

        dynamodb = boto3.resource("dynamodb")
        table = dynamodb.Table(table_name)
        response = table.get_item(Key={"id": process_id})
        item = response.get("Item", {})

        print(f"Approved request: {json.dumps(item, default=str, indent=2)}")

        # Mark as processed
        table.update_item(
            Key={"id": process_id},
            UpdateExpression="SET approval_status = :s, processed_at = :t",
            ExpressionAttributeValues={
                ":s": "PROCESSED",
                ":t": datetime.now().isoformat(),
            },
        )
        print("Request processed successfully")
        return item

    request = create_approval_request()

    wait_for_approval = DynamoDBValueSensor(
        task_id="wait_for_approval",
        table_name="{{ ti.xcom_pull(task_ids='create_approval_request')['table_name'] }}",
        partition_key_name="id",
        partition_key_value="{{ ti.xcom_pull(task_ids='create_approval_request')['process_id'] }}",
        attribute_name="approval_status",
        attribute_value="APPROVED",
        poke_interval=30,
        timeout=60 * 60 * 24,  # 24 hours
        mode="reschedule",
    )

    approved = process_approved()

    request >> wait_for_approval >> approved


ddb_approval_dag()
