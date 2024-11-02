#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ConnectCdkStack as ConnectCdkStack } from '../lib/connect_cdk-stack';

const app = new cdk.App();

new ConnectCdkStack(app, 'ConnectCdkStack');
