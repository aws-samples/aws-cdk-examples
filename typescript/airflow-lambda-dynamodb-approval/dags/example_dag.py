from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.empty import EmptyOperator
from airflow.operators.python import PythonOperator

def print_hello():
    print("Hello!")
    return "Hello!"

def print_goodbye():
    print("Goodbye!")
    return "Goodbye!"

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
    'example_dag',
    default_args=default_args,
    description='A simple example DAG for MWAA',
    schedule_interval=timedelta(hours=1),
    catchup=False,
    tags=['example'],
)

# Define tasks
start_task = EmptyOperator(
    task_id='start',
    dag=dag,
)

hello_task = PythonOperator(
    task_id='print_hello',
    python_callable=print_hello,
    dag=dag,
)

goodbye_task = PythonOperator(
    task_id='print_goodbye',
    python_callable=print_goodbye,
    dag=dag,
)

end_task = EmptyOperator(
    task_id='end',
    dag=dag,
)

# Define task dependencies
start_task >> hello_task >> goodbye_task >> end_task
