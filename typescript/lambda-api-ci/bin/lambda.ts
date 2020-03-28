#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { LambdaApiStack } from '../lib/lambda-api-stack';

export const lambdaApiStackName = 'LambdaApiStack'
export const lambdaFunctionName = 'WidgetStoreFunction'

const app = new cdk.App();
new LambdaApiStack(app, lambdaApiStackName, {
    functionName: lambdaFunctionName
});
