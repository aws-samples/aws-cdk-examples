#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { PipelineDemoStack } from '../lib/pipeline_demo-stack';

const app = new cdk.App();
new PipelineDemoStack(app, 'PipelineDemoStack',{

  env: { account: '123456789012', region: 'us-east-1' },

}

);
