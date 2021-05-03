import * as cdk from '@aws-cdk/core';
import { Ec2CdkStack } from '../lib/ec2-cdk-stack';

const app = new cdk.App();

new Ec2CdkStack(app, 'Ec2CdkStack', {});
