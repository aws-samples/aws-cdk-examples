#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { LambdaCloudwatchDashboardStack } from '../lib/lambda-cloudwatch-dashboard-stack';

export const cloudwatchDashboardName = "SampleLambdaDashboard"

const app = new cdk.App();
new LambdaCloudwatchDashboardStack(app, 'LambdaCloudwatchDashboardStack', {
  dashboardName: cloudwatchDashboardName,
});
