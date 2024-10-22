#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ApiGatewayAsyncLambdaStack } from '../lib/api-gateway-async-lambda-invocation-stack';

const app = new cdk.App();
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
const prefix = 'apigw-async-lambda';

const apigw_async_lambda = new ApiGatewayAsyncLambdaStack(app, 'ApiGatewayAsyncLambdaStack', {
  env,
  stackName: `${prefix}-stack`,
  prefix,
});
