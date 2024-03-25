#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkAppsyncDemoStack } from '../lib/cdk-appsync-demo-stack';

const env  = { region: 'eu-central-1' };
const app = new cdk.App();
new CdkAppsyncDemoStack(app, 'CdkAppsyncDemoStack', { env } );