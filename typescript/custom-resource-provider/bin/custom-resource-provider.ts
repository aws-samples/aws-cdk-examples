#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CustomResourceProviderStack } from '../lib/custom-resource-provider-stack';

const app = new cdk.App();
new CustomResourceProviderStack(app, 'CustomResourceProviderStack');
