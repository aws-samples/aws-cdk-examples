// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { SharedResourcesStack } from '../lib/shared-resources-stack';
import { ServiceAStack, ServiceBStack } from '../lib/sample-service-stack';

const app = new cdk.App();
const sharedResourcesStack = new SharedResourcesStack(app, 'SharedResourcesStack');

// Demonstrate this can work with S3 bucket and S3 Event Notification configuration defined in separate stacks
new ServiceAStack(app, 'ServiceAStack', { bucketName: sharedResourcesStack.bucketName });
new ServiceBStack(app, 'ServiceBStack', { bucketName: sharedResourcesStack.bucketName });
