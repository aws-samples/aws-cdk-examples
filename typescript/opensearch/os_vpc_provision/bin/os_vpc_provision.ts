#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { OsVpcProvisionStack } from '../lib/os_vpc_provision-stack';

const app = new cdk.App();
new OsVpcProvisionStack(app, 'mystack', {});
