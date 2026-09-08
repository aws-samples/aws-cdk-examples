#!/usr/bin/env node

import * as cdk from 'aws-cdk-lib';

import { NeptuneToOpenSearchServerlessStack } from '../lib/neptune-to-opensearch-serverless-stack';

const app = new cdk.App();

new NeptuneToOpenSearchServerlessStack(app, 'NeptuneToOpenSearchServerlessStack', {
  env: { region: 'us-east-1' },
  description: 'Neptune-to-OpenSearch Serverless replication for full-text search',
});
