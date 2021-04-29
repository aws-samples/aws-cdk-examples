import json

from aws_cdk import (
    aws_stepfunctions as sfn,
    aws_stepfunctions_tasks as sfn_tasks,
    aws_lambda_python as py,
    aws_s3 as s3,
    custom_resources as cr,
    core,
)


class EmptyS3BucketStack(core.Stack):

    def __init__(self, app: core.App, id: str, **kwargs) -> None:
        super().__init__(app, id, **kwargs)

        bucket_name_param = core.CfnParameter(
            self, 'BucketName',
            type='String',
            min_length=1
        )

        self.bucket_name = bucket_name_param.value_as_string

        bucket = s3.Bucket.from_bucket_name(
            self, 'bucket',
            bucket_name=bucket_name_param.value_as_string
        )

        delete_fn = py.PythonFunction(
            self, 'DeleteBucket',
            entry='empty_s3_bucket/lambda_fn/delete_fn',
            timeout=core.Duration.seconds(8)
        )

        bucket.grant_read_write(delete_fn.role)

        submit_job = sfn_tasks.LambdaInvoke(
            self, 'Empty S3 bucket objects',
            lambda_function=delete_fn,
            output_path='$.Payload'
        )

        wait_x = sfn.Wait(
            self, "Wait X Seconds",
            time=sfn.WaitTime.seconds_path('$.wait_time'),
        )

        status_fn = py.PythonFunction(
            self, 'CheckStatus',
            entry='empty_s3_bucket/lambda_fn/status_fn'
        )

        bucket.grant_read(status_fn.role)

        get_status = sfn_tasks.LambdaInvoke(
            self, 'Get job status',
            lambda_function=status_fn,
            output_path='$.Payload'
        )

        is_complete = sfn.Choice(
            self, "Job Complete?"
        )

        job_failed = sfn.Fail(
            self, "Job Failed",
            cause="AWS Batch Job Failed",
            error="DescribeJob returned FAILED"
        )

        final_status = sfn_tasks.LambdaInvoke(
            self, 'Get final job status',
            lambda_function=status_fn,
            output_path='$.Payload'
        )

        definition = submit_job \
            .next(wait_x) \
            .next(get_status) \
            .next(is_complete
                  .when(sfn.Condition.string_equals(
            "$.status", "FAILED"), job_failed)
                  .when(sfn.Condition.string_equals(
            "$.status", "SUCCEEDED"), final_status)
                  .otherwise(submit_job)
                  )

        state_machine = sfn.StateMachine(
            self, "EmptyS3Bucket",
            definition=definition,
            timeout=core.Duration.days(1),
        )

        cr.AwsCustomResource(
            self, 'CreateNewExecution',
            on_create=cr.AwsSdkCall(
                service='StepFunctions',
                action='startExecution',
                parameters={
                    'stateMachineArn': state_machine.state_machine_arn,
                    'input': json.dumps({
                        'bucketName': bucket_name_param.value_as_string
                    }),
                },
                physical_resource_id=cr.PhysicalResourceId.of('CreateNewExecution')
            ),
            policy=cr.AwsCustomResourcePolicy.from_sdk_calls(resources=[state_machine.state_machine_arn])
        )
