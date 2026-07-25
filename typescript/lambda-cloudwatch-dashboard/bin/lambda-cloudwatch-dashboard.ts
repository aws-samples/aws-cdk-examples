#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { LambdaCloudwatchDashboardStack } from '../lib/lambda-cloudwatch-dashboard-stack';

export const cloudwatchDashboardName = "SampleLambdaDashboard"

const app = new cdk.App();
new LambdaCloudwatchDashboardStack(app, 'LambdaCloudwatchDashboardStack', {
  dashboardName: cloudwatchDashboardName,
});
