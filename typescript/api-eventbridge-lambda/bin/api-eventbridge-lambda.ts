#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { ApiEventbridgeLambdaStack } from '../lib/api-eventbridge-lambda-stack';

const app = new cdk.App();
new ApiEventbridgeLambdaStack(app, 'ApiEventbridgeLambdaStack');
