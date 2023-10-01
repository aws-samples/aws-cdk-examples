#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import S3SnsSqsLambdaChainStack from '../lib/s3-sns-sqs-lambda-chain-stack';

const app = new App();
new S3SnsSqsLambdaChainStack(app, 'S3SnsSqsLambdaChain');
