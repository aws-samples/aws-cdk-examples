#!/usr/bin/env python3

from aws_cdk import App

from rekognition_lambda_s3_trigger.rekognition_lambda_s3_trigger_stack import RekognitionLambdaS3TriggerStack

app = App()
RekognitionLambdaS3TriggerStack(app, "RekognitionLambdaS3TriggerStack")

app.synth()
