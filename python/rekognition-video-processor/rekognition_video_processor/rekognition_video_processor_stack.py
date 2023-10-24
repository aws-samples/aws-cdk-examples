from aws_cdk import (
    RemovalPolicy,
    Stack,
    aws_s3 as s3,
    aws_lambda as lambda_,
    aws_iam as iam,
    aws_lambda_event_sources,
    aws_sns as sns,
    aws_sns_subscriptions as sns_subs,
)
from constructs import Construct

class RekognitionVideoProcessorStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

         # S3 bucket to store videos
        video_bucket = s3.Bucket(
            self,
            "S3Bucket",
            removal_policy=RemovalPolicy.DESTROY,
        )

        # SNS
        rekognition_sns_topic = sns.Topic(
            self,
            "RekognitionSnsTopic",
            display_name="Rekognition Job Completion SNS Topic",
        )

        rekognition_role = iam.Role(
            self,
            "RekognitionRole",
            assumed_by=iam.ServicePrincipal("rekognition.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name("AmazonSNSFullAccess"),
            ],
        )

        # Define IAM permissions needed
        s3_lambda_policy = iam.PolicyStatement(
            actions=["s3:GetObject"],
            resources=[video_bucket.bucket_arn, video_bucket.bucket_arn + "/*"],
            effect=iam.Effect.ALLOW,
        )
        rekognition_lambda_policy = iam.PolicyStatement(
            actions=["rekognition:*"],
            resources=["*"],
            effect=iam.Effect.ALLOW,
        )
        pass_role_lambda_policy =iam.PolicyStatement(
                actions=["iam:PassRole"],
                resources=[
                    rekognition_role.role_arn
                ],
            )

        # Lambda which detects when a video has been uploaded to the S3 bucket and starts the video processing with Rekognition
        start_processing_lambda_function = lambda_.Function(
            self,
            "LambdaFunction",
            function_name="start-processing-rekognition-demo-lambda",
            runtime=lambda_.Runtime.PYTHON_3_10,
            handler="index.lambda_handler",
            code=lambda_.Code.from_asset("lambdas/start_processing"),
            environment={
                "SNS_TOPIC_ARN": rekognition_sns_topic.topic_arn,
                "SNS_ROLE_ARN": rekognition_role.role_arn,
            },
        )

        # Lambda which detects when a video has been processed by reckognition. It stracts the data of each celebrity identified
        process_video_lambda = lambda_.Function(
            self,
            "RekognitionLambda",
            function_name="process-video-rekognition-demo-lambda",
            runtime=lambda_.Runtime.PYTHON_3_10,
            handler="index.lambda_handler",
            code=lambda_.Code.from_asset("lambdas/process_video"),
        )

        # Grant permissions to the lambdas defined
        start_processing_lambda_function.add_to_role_policy(s3_lambda_policy)
        start_processing_lambda_function.add_to_role_policy(rekognition_lambda_policy)
        start_processing_lambda_function.add_to_role_policy(pass_role_lambda_policy)

        process_video_lambda.add_to_role_policy(rekognition_lambda_policy)

        rekognition_sns_topic.grant_publish(process_video_lambda)
        rekognition_sns_topic.add_subscription(sns_subs.LambdaSubscription(process_video_lambda))

        # Automatically trigger lambda when new image is uploaded to S3
        start_processing_lambda_function.add_event_source(
            aws_lambda_event_sources.S3EventSource(
                video_bucket, events=[s3.EventType.OBJECT_CREATED]
            )
        )

        
