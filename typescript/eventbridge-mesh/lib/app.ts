#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { consumerStack } from './single-consumer-stack';
import { producerStack } from './single-producer-stack';

const app = new cdk.App();

const region            = 'us-east-1'
const producerAccountId = '111111111111';
const consumerAccountId = '222222222222';

new producerStack(app, 'producerStack', {
  env: {
    account: producerAccountId,
    region:  region,
  },
  consumerAccountId,
});

new consumerStack(app, 'consumerStack', {
  env: {
    account: consumerAccountId,
    region:  region,
  },
  producerAccountId,
});
