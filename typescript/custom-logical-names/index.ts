#!/usr/bin/env node
import { BaseStack } from './base-stack';
import { App, StackProps } from 'aws-cdk-lib';
import s3 = require('aws-cdk-lib/aws-s3');
import sns = require('aws-cdk-lib/aws-sns');
import { Construct } from 'constructs';

class MyStack extends BaseStack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new sns.Topic(this, 'MyTopic');
    new s3.Bucket(this, 'MyBucket');
  }
}

const app = new App();
new MyStack(app, 'MyStack');
app.synth();
