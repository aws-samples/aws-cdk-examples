from __future__ import print_function
from boto3.session import Session

import json
import urllib
import boto3
import zipfile
import tempfile
import botocore
import traceback
import time

print('Loading function')

eb = boto3.client('elasticbeanstalk')
code_pipeline = boto3.client('codepipeline')

def put_job_success(job, message):
    """Notify CodePipeline of a successful job

    Args:
        job: The CodePipeline job ID
        message: A message to be logged relating to the job status

    Raises:
        Exception: Any exception thrown by .put_job_success_result()

    """
    print('Putting job success')
    print(message)
    code_pipeline.put_job_success_result(jobId=job)

def put_job_failure(job, message):
    """Notify CodePipeline of a failed job

    Args:
        job: The CodePipeline job ID
        message: A message to be logged relating to the job status

    Raises:
        Exception: Any exception thrown by .put_job_failure_result()

    """
    print('Putting job failure')
    print(message)
    code_pipeline.put_job_failure_result(jobId=job, failureDetails={'message': message, 'type': 'JobFailed'})

def get_user_params(job_data):
    """Decodes the JSON user parameters and validates the required properties.

    Args:
        job_data: The job data structure containing the UserParameters string which should be a valid JSON structure

    Returns:
        The JSON parameters decoded as a dictionary.

    Raises:
        Exception: The JSON can't be decoded or a property is missing.

    """
    try:
        # Get the user parameters which contain the stack, artifact and file settings
        user_parameters = job_data['actionConfiguration']['configuration']['UserParameters']
        decoded_parameters = json.loads(user_parameters)

    except Exception as e:
        # We're expecting the user parameters to be encoded as JSON
        # so we can pass multiple values. If the JSON can't be decoded
        # then fail the job with a helpful message.
        raise Exception('UserParameters could not be decoded as JSON')

    if 'blueEnvironment' not in decoded_parameters:
        # Validate that the stack is provided, otherwise fail the job
        # with a helpful message.
        raise Exception('Your UserParameters JSON must include the Blue environment name')

    if 'greenEnvironment' not in decoded_parameters:
        # Validate that the stack is provided, otherwise fail the job
        # with a helpful message.
        raise Exception('Your UserParameters JSON must include the Green environment name')

    if 'application' not in decoded_parameters:
        # Validate that the artifact name is provided, otherwise fail the job
        # with a helpful message.
        raise Exception('Your UserParameters JSON must include the application name')


    return decoded_parameters


def describe_health(environmentName):
    response = eb.describe_environment_health(
    EnvironmentName=environmentName,
    AttributeNames=[
        'Status',
    ]
    )
    return response['Status']


def describe_app_version(version, application):
    response = eb.describe_application_versions(
        ApplicationName=application,
        VersionLabels=[
            version,
        ]
    )
    print ("App Version Status: ", response['ApplicationVersions'][0]['Status'])
    return response['ApplicationVersions'][0]['Status']

def create_app_version(artifact, application):
    """
    Creates the application Version to be deployed
    """
    bucket = artifact['location']['s3Location']['bucketName']
    key = artifact['location']['s3Location']['objectKey']
    version = artifact['revision'] + key
    version = version.replace("test/MyApp/", "")
    print ("version: ", version)

    response = eb.create_application_version(
        ApplicationName=application,
        VersionLabel=version,
        SourceBundle={
            'S3Bucket': bucket,
            'S3Key': key
        },
        Process=True
    )

    while True:
        status = describe_app_version(version, application)
        if status.upper() == "PROCESSED":
            break
        else:
            time.sleep(60)
    print ("App Version Created.")

    return version

def update_blue_env(blueEnvironment, versionLabel, application):
    """
    Deploys to Blue
    """

    response = eb.update_environment(
        ApplicationName=application,
        EnvironmentName=blueEnvironment,
        VersionLabel=versionLabel,
    )
    print ("Blue Deploy result: ",response)

    while True:
        status = describe_health(blueEnvironment)
        if status.upper() == "READY":
            break
        else:
            time.sleep(60)
    print ("Deployment to Blue complete.")

def swap_blue_green(blueEnvironment, greenEnvironment):
    """
    Swaps the CNAMEs for Blue and Green envs
    """
    response = eb.swap_environment_cnames(
        SourceEnvironmentName=blueEnvironment,
        DestinationEnvironmentName=greenEnvironment
    )
    print ("Blue Green Swap result: ",response)


def lambda_handler(event, context):
    """The Lambda function handler

    If a continuing job then checks the CloudFormation stack status
    and updates the job accordingly.

    If a new job then kick of an update or creation of the target
    CloudFormation stack.

    Args:
        event: The event passed by Lambda
        context: The context passed by Lambda

    """
    try:
        # Extract the Job ID
        job_id = event['CodePipeline.job']['id']

        # Extract the Job Data
        job_data = event['CodePipeline.job']['data']

        # Extract the params
        params = get_user_params(job_data)

        # Get the list of artifacts passed to the function
        artifacts = job_data['inputArtifacts']
        print ("artifacts are: ", artifacts[0])

        blueEnvironment = params['blueEnvironment']
        greenEnvironment = params['greenEnvironment']
        application = params['application']

        envStatus = describe_health(blueEnvironment)
        if envStatus == 'Ready':
            versionLabel = create_app_version(artifacts[0], application)
            update_blue_env(blueEnvironment, versionLabel, application)
            swap_blue_green(blueEnvironment, greenEnvironment)
            put_job_success(job_id, 'Done')
        else:
            put_job_failure(job_id, 'Environment is not in Ready state')



    except Exception as e:
        # If any other exceptions which we didn't expect are raised
        # then fail the job and log the exception message.
        print('Function failed due to exception.')
        print(e)
        traceback.print_exc()
        put_job_failure(job_id, 'Function exception: ' + str(e))

    print('Function complete.')
    return "Complete."
