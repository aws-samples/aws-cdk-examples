#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { S3SnsSqsLambdaChainStack } from '../lib/s3_sns_sqs_lambda_chain-stack';

const app = new cdk.App();
new S3SnsSqsLambdaChainStack(app, 'S3SnsSqsLambdaChainStack');
