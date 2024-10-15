#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { pipelineStack } from './pipeline-stack';

const app               = new cdk.App();
const env               = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
const pipelineAccountId = process.env.PIPELINE_ACCOUNT_ID || "111111111111";                 // replace with your pipeline account id
const pipelineRegion    = process.env.PIPELINE_REGION     || "us-east-1";                    // replace with your pipeline region
const githubOrg         = process.env.GITHUB_ORG          || "aws-6w8hnx";                   // replace with your GitHub Org
const githubRepo        = process.env.GITHUB_REPO         || "aws-codepipeline-ecs-lambda";  // replace with your GitHub Repo
const githubBranch      = process.env.GITHUB_BRANCH       || "main";                         // replace with your GitHub repo branch
const devEnv            = process.env.DEV_ENV             || "dev";                          // replace with your environment
const devAccountId      = process.env.DEV_ACCOUNT_ID      || "222222222222";                 // replace with your dev account id
const primaryRegion     = process.env.PRIMARY_REGION      || "us-west-2";                    // replace with your primary region
const secondaryRegion   = process.env.SECONDARY_REGION    || "eu-west-1";                    // replace with your secondary region


const pipeline_stack = new pipelineStack(app, 'aws-codepipeline-stack', {
  env,
  pipelineAccountId,
  pipelineRegion,
  githubOrg,
  githubRepo,
  githubBranch,
  devEnv,
  devAccountId,
  primaryRegion,
  secondaryRegion,
});
cdk.Tags.of(pipeline_stack).add('managedBy', 'cdk');
cdk.Tags.of(pipeline_stack).add('environment', 'dev');

app.synth();
