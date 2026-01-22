#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AwsMwaaCdkStack } from '../lib/aws-mwaa-cdk-stack';

const app = new cdk.App();
new AwsMwaaCdkStack(app, 'AwsMwaaCdkStack');
