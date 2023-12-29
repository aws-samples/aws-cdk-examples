#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { LambdaPCScalingTargetStack } from '../lib/lambda-pc-autoscaling-target';
import { LambdaPCScalingScheduleStack } from '../lib/lambda-pc-autoscaling-schedule';

export const lambdaFunctionName = "LambdaPCAutoScalingExample"

const app = new cdk.App();
new LambdaPCScalingTargetStack(app, 'LambdaProvisionedConcurrencyScalingTarget', {
  functionName: `${lambdaFunctionName}Target`,
});

new LambdaPCScalingScheduleStack(app, 'LambdaProvisionedConcurrencyScalingSchedule', {
  functionName: `${lambdaFunctionName}Schedule`,
});
