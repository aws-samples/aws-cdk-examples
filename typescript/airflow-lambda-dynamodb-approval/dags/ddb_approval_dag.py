import pendulum
import os
import boto3
from datetime import datetime
from airflow.models.dag import DAG
from airflow.providers.amazon.aws.sensors.dynamodb import DynamoDBValueSensor
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator

def get_approval_table_name():
    """Get the DynamoDB approval table name created by CDK"""
    # Use the same naming pattern as CDK: mwaa-approval-table-${region}
    try:
        session = boto3.Session()
        region = session.region_name or 'us-west-2'  # Default region
        return f"mwaa-approval-table-{region}"
    except:
        # Final fallback
        return "mwaa-approval-table-us-west-2"

def create_approval_request(**context):
    """Create an approval request in DynamoDB that needs human approval"""
    import boto3
    import json
    from datetime import datetime
    
    # Get process ID from DAG run config or use default
    dag_conf = context.get('dag_run').conf or {}
    process_id = dag_conf.get('process_id', "finance-run-12345")
    
    # Get approval details from config
    approval_context = {
        'id': process_id,  # DynamoDB partition key must be 'id'
        'process_id': process_id,  # Keep for backwards compatibility
        'transaction_amount': dag_conf.get('amount', 25000),
        'requester': dag_conf.get('requester', 'requester-123'),
        'department': dag_conf.get('department', 'finance'),
        'reason': dag_conf.get('reason', 'reason-123'),
        'urgency': dag_conf.get('urgency', 'HIGH'),
        'created_at': datetime.now().isoformat(),
        'approval_status': 'PENDING',
        'dag_run_id': context['dag_run'].run_id,
        'dag_id': context['dag'].dag_id
    }
    
    table_name = get_approval_table_name()
    print(f"📝 Creating approval request in DynamoDB table: {table_name}")
    print(f"   Process ID: {process_id}")
    print(f"   Amount: ${approval_context['transaction_amount']:,}")
    print(f"   Requester: {approval_context['requester']}")
    print(f"   Department: {approval_context['department']}")
    print(f"   Urgency: {approval_context['urgency']}")
    
    try:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(table_name)
        
        # Create the approval request
        response = table.put_item(Item=approval_context)
        
        print("✅ Approval request created successfully")
        print(f"   Waiting for human approval on process: {process_id}")
        print(f"   Approvers should set 'approval_status' to 'APPROVED' in DynamoDB")
        
        # Store process ID for the sensor
        context['task_instance'].xcom_push(key='process_id', value=process_id)
        
        return approval_context
        
    except Exception as e:
        print(f"❌ Error creating approval request: {e}")
        raise

def process_approved_transaction(**context):
    """Process the transaction after human approval"""
    
    # Get process ID from XCom
    process_id = context['task_instance'].xcom_pull(
        task_ids='create_approval_request', 
        key='process_id'
    )
    
    # Get the approved record from DynamoDB
    table_name = get_approval_table_name()
    
    try:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(table_name)
        
        response = table.get_item(Key={'id': process_id})
        
        if 'Item' in response:
            approved_item = response['Item']
            
            print("🎉 TRANSACTION APPROVED AND PROCESSING")
            print("=" * 50)
            print(f"   Process ID: {approved_item.get('process_id', 'unknown')}")
            print(f"   Amount: ${approved_item.get('transaction_amount', 0):,}")
            print(f"   Requester: {approved_item.get('requester', 'unknown')}")
            print(f"   Department: {approved_item.get('department', 'unknown')}")
            print(f"   Approved At: {approved_item.get('approval_status', 'unknown')}")
            print("=" * 50)
            
            # Simulate transaction processing
            processing_steps = [
                "Validating approval authority",
                "Checking budget allocation", 
                "Processing payment",
                "Updating financial records",
                "Sending confirmation"
            ]
            
            for step in processing_steps:
                print(f"  ✓ {step}")
            
            # Update the record to show it's been processed
            table.update_item(
                Key={'id': process_id},
                UpdateExpression='SET approval_status = :status, processed_at = :processed_at',
                ExpressionAttributeValues={
                    ':status': 'PROCESSED',
                    ':processed_at': datetime.now().isoformat()
                }
            )
            
            print("✅ Transaction processing completed successfully!")
            
            return approved_item
        else:
            print(f"⚠️  Warning: Could not find approved record for process {process_id}")
            return None
            
    except Exception as e:
        print(f"❌ Error processing approved transaction: {e}")
        raise

# Get the DynamoDB table name from CDK
APPROVAL_TABLE = get_approval_table_name()

with DAG(
    dag_id="dynamodb_human_approval_pipeline",
    start_date=pendulum.datetime(2025, 1, 1),
    schedule=None,
    tags=["dynamodb", "human-approval", "demo"],
    catchup=False,
    description="Human approval workflow using DynamoDB sensor - waits for manual approval in DDB table",
) as dag:
    
    # Task 1: Create approval request in DynamoDB
    create_request = PythonOperator(
        task_id="create_approval_request",
        python_callable=create_approval_request,
    )
    
    # Task 2: Wait for human approval in DynamoDB
    wait_for_approval = DynamoDBValueSensor(
        task_id="wait_for_approval",
        aws_conn_id="aws_default",
        table_name=APPROVAL_TABLE,
        # Key for the item - will be the process_id from the previous task
        partition_key_name="id",
        partition_key_value="{{ ti.xcom_pull(task_ids='create_approval_request', key='process_id') }}",
        # Check for approval_status = 'APPROVED'
        attribute_name="approval_status",
        attribute_value="APPROVED",
        # How often to check (in seconds)
        poke_interval=30,
        # Maximum time to wait (1 day)
        timeout=60 * 60 * 24,
        mode="reschedule",
    )

    # Task 3: Process the approved transaction
    process_transaction = PythonOperator(
        task_id="process_approved_transaction", 
        python_callable=process_approved_transaction,
    )

    # Task 4: Final confirmation
    completion_message = BashOperator(
        task_id="approval_workflow_complete",
        bash_command='echo "🎉 Human approval workflow completed successfully! Transaction processed."'
    )

    # Define task flow
    create_request >> wait_for_approval >> process_transaction >> completion_message
