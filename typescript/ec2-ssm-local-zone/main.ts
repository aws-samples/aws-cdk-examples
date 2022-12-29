#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ExampleLocalZoneStack } from './example-localzone-stack';

// Follow the setup process at https://docs.aws.amazon.com/cdk/v2/guide/environments.html
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new cdk.App();
new ExampleLocalZoneStack(app, 'ExampleLocalZoneStack', { env });
