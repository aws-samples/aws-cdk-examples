// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as lambda from '@aws-cdk/aws-lambda';
import * as iam from '@aws-cdk/aws-iam';
import * as path from 'path';

export class SharedStack extends cdk.Stack {
  public readonly bucketName: string;
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'SampleBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    this.bucketName = bucket.bucketName;

    const fn = new lambda.Function(this, 'S3EventNotificationsLambda', {
      runtime: lambda.Runtime.NODEJS_12_X,
      functionName: 'S3EventNotificationsManager',
      handler: 'manage-s3-event-notifications.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      reservedConcurrentExecutions: 1,
      timeout: cdk.Duration.seconds(300)
    });
    
    fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetBucketNotification', 's3:PutBucketNotification'],
        effect: iam.Effect.ALLOW,
        resources: [ bucket.bucketArn ]
      })
    );
  }
}
