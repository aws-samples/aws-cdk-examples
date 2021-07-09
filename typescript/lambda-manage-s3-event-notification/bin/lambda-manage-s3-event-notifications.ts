// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { SharedStack } from '../lib/shared-resources-stack';
import { AStack, BStack } from '../lib/sample-service-stack';

const app = new cdk.App();
const sharedStack = new SharedStack(app, 'SharedStack');

// Demonstrate this can work with S3 bucket and S3 Event Notification configuration defined in separate stacks
new AStack(app, 'AStack', { bucketName: sharedStack.bucketName });
new BStack(app, 'BStack', { bucketName: sharedStack.bucketName });
