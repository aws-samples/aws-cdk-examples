#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { LambdaApiCiStack } from '../lib/ci-stack';

const app = new cdk.App();
new LambdaApiCiStack(app, 'LambdaApiCiStack');
