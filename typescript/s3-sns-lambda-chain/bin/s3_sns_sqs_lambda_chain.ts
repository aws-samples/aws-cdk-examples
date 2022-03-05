#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { S3SnsSqsLambdaChainStack } from '../lib/s3_sns_sqs_lambda_chain-stack';

const app = new App();
new S3SnsSqsLambdaChainStack(app, 'S3SnsSqsLambdaChainStack');
