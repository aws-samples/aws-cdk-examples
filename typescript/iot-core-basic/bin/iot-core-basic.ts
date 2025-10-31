#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { IotCoreBasicStack } from '../lib/iot-core-basic-stack';

const app = new cdk.App();
new IotCoreBasicStack(app, 'IotCoreBasicStack', {
  description: 'AWS IoT Core basic example with Thing, Certificate, Policy, and Kinesis integration'
});
