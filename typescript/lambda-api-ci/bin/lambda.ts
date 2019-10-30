#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { LambdaApiStack } from '../lib/lambda-api-stack';

const app = new cdk.App();
new LambdaApiStack(app, 'LambdaApiCiStack');
