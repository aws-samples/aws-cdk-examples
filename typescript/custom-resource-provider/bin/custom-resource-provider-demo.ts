#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CustomResourceProviderDemoStack } from '../lib/custom-resource-provider-demo-stack';

const app = new cdk.App();
new CustomResourceProviderDemoStack(app, 'CustomResourceProviderDemoStack');
