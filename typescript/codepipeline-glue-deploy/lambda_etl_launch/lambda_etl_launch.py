import json
import os
import base64
from os.path import join

import boto3

s3 = boto3.client('s3')
glue = boto3.client('glue')
pipeline = boto3.client('codepipeline')
codecommit = boto3.client('codecommit')


def lambda_handler(event, context):
    job = event['CodePipeline.job']
    try:
        data = job['data']
        config = data['actionConfiguration']['configuration']
        user_params = json.loads(config['UserParameters'])

        print(json.dumps(event))

        input_artifacts = data['inputArtifacts']
        source_code_artifact = input_artifacts[0]

        artifact_bucket = source_code_artifact['location']['s3Location']['bucketName']
        artifact_key = source_code_artifact['location']['s3Location']['objectKey']
        filename = os.getenv('FILENAME')
        file_key = join(artifact_key, filename)
        commit_id = source_code_artifact['revision']

        repository_name = os.getenv('REPOSITORY_NAME')
        print('repository_name', repository_name)

        codecommit_resp = codecommit.get_file(
            repositoryName=repository_name,
            commitSpecifier=commit_id,
            filePath=filename
        )
        print('codecommit_resp', codecommit_resp)

        s3_resp = s3.put_object(
            Bucket=artifact_bucket,
            Key=file_key,
            Body=codecommit_resp['fileContent']
        )
        print('s3_resp', s3_resp)

        s3_status_code = s3_resp['ResponseMetadata']['HTTPStatusCode']
        if s3_status_code != 200:
            raise Exception(f'Failed to send file to S3. StatusCode={s3_status_code}')

        s3_script_location = f's3://{artifact_bucket}/{file_key}'

        glue_job_name_id = artifact_key.split('/')[-1:][0]
        glue_job_name = f'{user_params["glue_job_name"]}_{glue_job_name_id}'
        print('glue_job_named:', glue_job_name)

        default_arguments = {}
        if 'additional_python_modules' in user_params:
            default_arguments['--additional-python-modules'] = user_params['additional_python_modules']

        create_job_resp = glue.create_job(
            Name=glue_job_name,
            Role=user_params['glue_role'],
            Command={
                'Name': 'glueetl',
                'ScriptLocation': s3_script_location
            },
            DefaultArguments=default_arguments,
            GlueVersion='4.0'
        )
        print('create_job_resp:', create_job_resp)

        start_job_run_resp = glue.start_job_run(
            JobName=create_job_resp['Name'],
            Arguments={
            }
        )
        print('start_job_run_resp:', start_job_run_resp)

        print('submitting successful job')
        pipeline.put_job_success_result(jobId=job['id'])
    except Exception as e:
        print('submitting unsuccessful job: ' + str(e))
        pipeline.put_job_failure_result(
            jobId=job['id'],
            failureDetails={
                'type': 'JobFailed',
                'message': str(e)
            }
        )
