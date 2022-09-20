#!/usr/bin/env node

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

import { NeptuneWithVpcStack } from './neptune-with-vpc-stack';

const app = new cdk.App();

new NeptuneWithVpcStack(app, 'NeptuneWithVpcStack', { env: { region: "us-east-1" }, description: "Neptune cluster with a VPC" });
