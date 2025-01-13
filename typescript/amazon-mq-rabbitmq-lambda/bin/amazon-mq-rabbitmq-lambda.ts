#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AmazonMqRabbitmqLambdaStack } from '../lib/amazon-mq-rabbitmq-lambda-stack';

const app = new cdk.App();
new AmazonMqRabbitmqLambdaStack(app, 'AmazonMqRabbitmqLambdaStack');
