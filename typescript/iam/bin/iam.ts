#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { IamStack } from '../lib/iam-stack';

const app = new cdk.App();
new IamStack(app, 'IamStack');
