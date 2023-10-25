#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CodewhispererDashboardStack } from '../lib/codewhisperer-dashboard-stack';

const app = new cdk.App();
new CodewhispererDashboardStack(app, 'CodewhispererDashboardStack', {
   env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
