#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { Inspector2EnableResource } from '../lib/inspector2-enable-resource';
import { Inspector2EnableDelegatedAdminAccountResource } from '../lib/inspector2-enable-delegated-admin-account-resource';
import { Inspector2MonitoringResource } from '../lib/inspector2-monitoring-resource';

// Follow the setup process at https://docs.aws.amazon.com/cdk/v2/guide/environments.html
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new cdk.App();

const inspector2EnableStack = new cdk.Stack(app, 'Inspector2EnableStack', {
  env,
  description: 'Enables Amazon Inspector only on current account',
});
new Inspector2EnableResource(inspector2EnableStack, 'EnableInspector2Resource', {
  resourceTypes: ['ECR', 'EC2', 'LAMBDA'],
});

const inspector2DelegatedAdminStack = new cdk.Stack(app, 'Inspector2EnableDelegatedAdminAccountStack', {
  env,
  description: 'Enables Amazon Inspector delegated admin on current account and sets auto-enable on all member accounts',
});

new Inspector2EnableDelegatedAdminAccountResource(inspector2DelegatedAdminStack, 'Inspector2EnableDelegatedAdminAccountResource', {
  delegatedAdminAccountId: app.node.tryGetContext('delegatedAdminAccount') ?? cdk.Aws.ACCOUNT_ID,
  inspector2EnableProps: {
    resourceTypes: ['ECR', 'EC2', 'LAMBDA'],
    logRetention: cdk.aws_logs.RetentionDays.ONE_DAY,
  },
  autoEnable: {
    ec2: true,
    ecr: true,
    lambda: true,
  },
  logRetention: cdk.aws_logs.RetentionDays.ONE_DAY,
});

const inspector2MonitoringStack = new cdk.Stack(app, 'Inspector2MonitoringStack', {
  env,
  description: 'Enables Amazon Inspector only on current account',
});

new Inspector2MonitoringResource(inspector2MonitoringStack, 'Inspector2Monitoring', { });
