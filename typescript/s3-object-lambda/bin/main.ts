#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { S3ObjectLambdaStack } from '../lib/s3-object-lambda-stack';

const app = new cdk.App();
new S3ObjectLambdaStack(app, 'S3ObjectLambdaStack');
