#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import {LambdaLayerStack} from '../lib/lambda-layer-stack';

const app = new cdk.App();
new LambdaLayerStack(app, 'LambdaLayerStack');
