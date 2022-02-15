// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

export interface AStackProps extends cdk.StackProps {
  readonly bucketName: string; // Bucket to enable SQS notifications
}
export class AStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AStackProps) {
    super(scope, id, props);

    const queue = new sqs.Queue(this, 'SampleQueue');
    queue.grant(new iam.ServicePrincipal('s3.amazonaws.com', {
      conditions: {
        ArnLike: {
          'aws:SourceArn': cdk.Arn.format({
            service: 's3',
            region: '',
            account: '',
            resource: props.bucketName
          }, this)
        }
      }
    }), 'sqs:SendMessage', 'sqs:GetQueueAttributes', 'sqs:GetQueueUrl');

    const lambdaArn = cdk.Arn.format({
      service: 'lambda',
      resource: 'S3EventNotificationsManager'
    }, this);
    new cdk.CustomResource(this, 'SampleBucketNotification', {
      serviceToken: lambdaArn,
      properties: {
        BucketName: props.bucketName,
        NotificationConfiguration: {
          QueueConfigurations: [
            {
              Id: 'SampleQueueNotification',
              Events: ['s3:ObjectCreated:*'],
              Filter: {
                Key: {
                  FilterRules: [
                    {
                      Name: 'prefix',
                      Value: 'CategoryA/'
                    }
                  ]
                }
              },
              QueueArn: queue.queueArn
            }
          ]
        }
      }
    });
  }
}

export interface BStackProps extends cdk.StackProps {
  readonly bucketName: string; // Bucket to enable SNS notifications
}
export class BStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BStackProps) {
    super(scope, id, props);

    const topic = new sns.Topic(this, 'SampleTopic');
    topic.grantPublish(new iam.ServicePrincipal('s3.amazonaws.com', {
      conditions: {
        ArnLike: {
          'aws:SourceArn': cdk.Arn.format({
            service: 's3',
            region: '',
            account: '',
            resource: props.bucketName
          }, this)
        }
      }
    }));

    const lambdaArn = cdk.Arn.format({
      service: 'lambda',
      resource: 'S3EventNotificationsManager'
    }, this);
    new cdk.CustomResource(this, 'SampleBucketNotification', {
      serviceToken: lambdaArn,
      properties: {
        BucketName: props.bucketName,
        NotificationConfiguration: {
          TopicConfigurations: [
            {
              Id: 'SampleSnsNotification',
              Events: ['s3:ObjectCreated:*'],
              Filter: {
                Key: {
                  FilterRules: [
                    {
                      Name: 'prefix',
                      Value: 'CategoryB/'
                    }
                  ]
                }
              },
              TopicArn: topic.topicArn
            }
          ]
        }
      }
    });
  }
}
