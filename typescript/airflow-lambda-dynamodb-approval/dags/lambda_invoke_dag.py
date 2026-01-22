from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
import boto3
import json

def check_lambda_functions():
    """Python function to list available Lambda functions"""
    lambda_client = boto3.client('lambda')
    
    try:
        response = lambda_client.list_functions()
        functions = response.get('Functions', [])
        
        print(f"Found {len(functions)} Lambda functions:")
        for func in functions[:5]:  # Show first 5 functions
            print(f"- {func['FunctionName']} (Runtime: {func['Runtime']})")
            
        return f"Successfully listed {len(functions)} Lambda functions"
    except Exception as e:
        print(f"Error listing Lambda functions: {e}")
        return f"Error: {e}"

def invoke_lambda_with_boto3(**context):
    """Example of invoking Lambda using boto3 client directly"""
    lambda_client = boto3.client('lambda')
    
    # Example payload - modify according to your Lambda function
    payload = {
        "message": "Hello from Airflow!",
        "timestamp": datetime.now().isoformat(),
        "dag_id": context['dag'].dag_id,
        "task_id": context['task'].task_id
    }
    
    function_name = "mwaa-demo-function"  # Demo Lambda function created by CDK
    
    try:
        response = lambda_client.invoke(
            FunctionName=function_name,
            InvocationType='RequestResponse',  # Synchronous invocation
            Payload=json.dumps(payload)
        )
        
        # Read the response
        response_payload = json.loads(response['Payload'].read())
        print(f"Lambda response: {response_payload}")
        
        return response_payload
    except lambda_client.exceptions.ResourceNotFoundException:
        print(f"Lambda function '{function_name}' not found. This is expected for the demo.")
        print("To use this task with a real Lambda function:")
        print("1. Create a Lambda function in your AWS account")
        print("2. Replace 'your-lambda-function-name' with the actual function name")
        print("3. Redeploy your DAGs to S3")
        return "Demo completed - Lambda function not found"
    except Exception as e:
        print(f"Error invoking Lambda function '{function_name}': {e}")
        return f"Error: {e}"

# Default arguments for the DAG
default_args = {
    'owner': 'airflow',
    'depends_on_past': False,
    'start_date': datetime(2023, 1, 1),
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

# Define the DAG
dag = DAG(
    'lambda_invoke_example',
    default_args=default_args,
    description='Example DAG showing Lambda function invocation  ',
    schedule_interval=None,  # Manual trigger only
    catchup=False,
    tags=['lambda', 'example', 'aws'],
)

# Task 1: List available Lambda functions
list_functions_task = PythonOperator(
    task_id='list_lambda_functions',
    python_callable=check_lambda_functions,
    dag=dag,
)

# Task 2: Invoke Lambda using boto3 (works for any Lambda function)
invoke_with_boto3_task = PythonOperator(
    task_id='invoke_lambda_boto3',
    python_callable=invoke_lambda_with_boto3,
    dag=dag,
)

# Define task dependencies
list_functions_task >> invoke_with_boto3_task
