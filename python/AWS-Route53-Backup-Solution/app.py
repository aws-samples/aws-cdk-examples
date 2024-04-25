from aws_cdk import core
import os

from aws_cdk import (
    aws_s3 as s3,
    aws_lambda as _lambda,
    aws_events as events,
    aws_events_targets as targets,
    aws_iam as iam,
    core
)

class R53BackupStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # S3 bucket for backups
        bucket = s3.Bucket(self, "R53BackupBucket")

        # Lambda function for R53 backups
        lambda_function_name='r53_backup'
        lambda_fn = _lambda.Function(
            self, "R53BackupFunction",
            runtime=_lambda.Runtime.PYTHON_3_9,
            handler=f"index.lambda_handler",
            code=_lambda.Code.asset(f'lambda/{lambda_function_name}'),  # Adjust path as needed
            environment={
                'BUCKET_NAME': bucket.bucket_name
            },
            timeout = core.Duration.minutes(5)
        )

        # IAM role permissions
        bucket.grant_put(lambda_fn)
        lambda_fn.add_to_role_policy(iam.PolicyStatement(
            actions=["route53:ListHostedZones", "route53:ListResourceRecordSets"],
            resources=["*"]
        ))
         # EventBridge rule to trigger Lambda every day at 1:00 AM UTC
        rule = events.Rule(
            self, "Rule",
            schedule=events.Schedule.cron(
                minute='0',
                hour='1',
                month='*',
                year='*',
                day='*'
            )
        )
        rule.add_target(targets.LambdaFunction(lambda_fn))


app = core.App()
R53BackupStack(app, "R53BackupStack")
app.synth()