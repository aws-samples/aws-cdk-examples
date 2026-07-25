#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { OsVpcProvisionStack } from '../lib/os_vpc_provision-stack';

const app = new cdk.App();
new OsVpcProvisionStack(app, 'mystack', {});
