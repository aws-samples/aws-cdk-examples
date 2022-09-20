#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { RekognitionLambdaS3TriggerStack } from '../lib/rekognition-lambda-s3-trigger-stack';

const app = new cdk.App();
new RekognitionLambdaS3TriggerStack(app, 'RekognitionLambdaS3TriggerStack');