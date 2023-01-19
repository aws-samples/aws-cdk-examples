#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { FrontendCicdStack } from '../lib/frontend-cicd-stack';

const app = new cdk.App();
new FrontendCicdStack(app, 'FrontendCicdStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});