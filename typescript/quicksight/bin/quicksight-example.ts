#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { QuicksightExampleStack } from '../lib/quicksight-example-stack';

const app = new cdk.App();

// Quicksight account arn should look like this 'arn:aws:quicksight:<region>:<accountid>:user/<namespace>/<username>'
const quicksightExampleProps = {quicksightAccountArn: app.node.tryGetContext('quicksightAccountArn')};
if (quicksightExampleProps.quicksightAccountArn == null) {
  console.log('quicksightAccountArn is empty! Please provide it via the cdk context');
  process.exit(1);
}
new QuicksightExampleStack(app, 'QuicksightExampleStack', quicksightExampleProps);
