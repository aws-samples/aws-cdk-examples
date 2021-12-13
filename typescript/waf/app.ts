#!/usr/bin/env node

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

import { WafRegionalStack }   from './waf-regional';
import { WafCloudFrontStack } from './waf-cloudfront';

const app = new cdk.App();

new WafRegionalStack(app,   'WafRegionalStack',   {env:{region:"us-east-1"}, description:"WAF Regional"});
new WafCloudFrontStack(app, 'WafCloudFrontStack', {env:{region:"us-east-1"}, description:"WAF CloudFront"});



