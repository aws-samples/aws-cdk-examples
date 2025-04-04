#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { consumerStack } from './single-consumer-stack';
import { producerStack } from './single-producer-stack';

const app = new cdk.App();
const appName           = 'eventbridge-mesh'
const region            = 'us-east-1'
const producerAccountId = '123510061335';
const consumerAccountId = '737719307477';

new producerStack(app, `${appName}-producer-stack`, {
  env: {
    account: producerAccountId,
    region:  region,
  },
  appName,
  consumerAccountId,
});

new consumerStack(app, `${appName}-consumer-stack`, {
  env: {
    account: consumerAccountId,
    region:  region,
  },
  appName,
  producerAccountId,
});
