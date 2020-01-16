from aws_cdk import (
    core,
    aws_codepipeline_actions as cpactions,
    aws_codepipeline as cp,
    aws_codecommit as cc,
    aws_lambda as lmbda,
    aws_s3 as s3
)


class ElasticbeanstalkBgPipelineStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        blue_env = self.node.try_get_context("blue_env")
        green_env = self.node.try_get_context("green_env")
        app_name = self.node.try_get_context("app_name")

        bucket = s3.Bucket(
            self, 'BlueGreenBucket',
            # The default removal policy is RETAIN, which means that cdk
            # destroy will not attempt to delete the new bucket, and it will
            # remain in your account until manually deleted. By setting the
            # policy to DESTROY, cdk destroy will attempt to delete the bucket,
            # but will error if the bucket is not empty.
            removal_policy=core.RemovalPolicy.DESTROY
            # NOT recommended for production code
        )

        handler = lmbda.Function(
            self, 'BlueGreenLambda',
            runtime=lmbda.Runtime.PYTHON_3_6,
            code=lmbda.Code.asset('resources'),
            handler='blue_green.lambda_handler',
            environment={
              'BUCKET': bucket.bucket_name
            }
        )

        bucket.grant_read_write(handler)

        repo = cc.Repository(
            self, 'Repository',
            repository_name='MyRepositoryName',
        )

        pipeline = cp.Pipeline(self, 'MyFirstPipeline')

        source_stage = pipeline.add_stage(
            stage_name='Source'
        )

        source_artifact = cp.Artifact('Source')

        source_action = cpactions.CodeCommitSourceAction(
            action_name='CodeCommit',
            repository=repo,
            output=source_artifact
        )

        source_stage.add_action(source_action)

        deploy_stage = pipeline.add_stage(
            stage_name='Deploy'
        )

        lambda_action = cpactions.LambdaInvokeAction(
          action_name='InvokeAction',
          lambda_=handler,
          user_parameters={
            'blueEnvironment': blue_env,
            'greenEnvironment': green_env,
            'application': app_name
          },
          inputs=[source_artifact]
        )

        deploy_stage.add_action(lambda_action)