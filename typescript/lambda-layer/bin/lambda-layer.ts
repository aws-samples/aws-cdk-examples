#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import {LambdaLayerStack} from '../lib/lambda-layer-stack';

const app = new cdk.App();
new LambdaLayerStack(app, 'LambdaLayerStack');
