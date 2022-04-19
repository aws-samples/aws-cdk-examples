// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SharedStack } from '../lib/shared-resources-stack';
import { AStack, BStack } from '../lib/sample-service-stack';

const app = new cdk.App();
const sharedStack = new SharedStack(app, 'SharedStack', {
  description: "Creates shared S3 bucket and Lambda function to manage notifications on the bucket (qs-1s4376pnc)"
});

// Demonstrate this can work with S3 bucket and S3 Event Notification configuration defined in separate stacks
new AStack(app, 'AStack', {
  description: "Stack that synthesizes S3 event notifications to an SQS queue (qs-1s4376pnc)",
  bucketName: sharedStack.bucketName
});
new BStack(app, 'BStack', {
  description: "Stack that synthesizes S3 event notifications to an SNS topic (qs-1s4376pnc)",
  bucketName: sharedStack.bucketName
});
