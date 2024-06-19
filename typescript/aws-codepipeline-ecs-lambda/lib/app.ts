#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { pipelineStack } from './pipeline-stack';

const app = new cdk.App();
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }

const pipeline_stack = new pipelineStack(app, 'aws-codepipeline-stack', {
  env,
});
cdk.Tags.of(pipeline_stack).add('managedBy', 'cdk');
cdk.Tags.of(pipeline_stack).add('environment', 'dev');

app.synth();
