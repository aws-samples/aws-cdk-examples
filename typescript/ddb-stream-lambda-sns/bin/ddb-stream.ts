#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DdbStreamStack } from '../lib/ddb-stream-stack';

const app = new cdk.App();
new DdbStreamStack(app, 'DdbStreamStack', {});