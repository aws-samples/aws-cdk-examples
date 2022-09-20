#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {LambdaLayerStack} from '../lib/lambda-layer-stack';

const app = new cdk.App();
new LambdaLayerStack(app, 'LambdaLayerStack');
