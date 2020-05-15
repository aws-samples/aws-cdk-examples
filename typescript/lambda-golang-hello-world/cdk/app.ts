#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import {LambdaStack} from "./lambda_stack";

const app = new cdk.App();
new LambdaStack(app, 'HelloWorldLambdaStack');
