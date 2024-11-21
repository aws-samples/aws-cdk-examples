#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {DemoCloudfrontFunctionsStack} from '../lib/demo-cloudfront-functions-stack';

const app = new cdk.App();

new DemoCloudfrontFunctionsStack(app, 'DemoCloudfrontFunctionsStack', {});
