#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { CodepipelineGlueDeployStack } from '../lib/codepipeline-glue-deploy-stack';

const app = new App();
new CodepipelineGlueDeployStack(app, 'CodepipelineGlueDeploy', {});