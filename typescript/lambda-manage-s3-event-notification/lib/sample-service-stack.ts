// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from '@aws-cdk/core';
import * as sqs from '@aws-cdk/aws-sqs';
import * as iam from '@aws-cdk/aws-iam';
import * as sns from '@aws-cdk/aws-sns';

export interface ServiceAStackProps extends cdk.StackProps {
  readonly bucketName: string; // Bucket to enable SQS notifications
}
export class ServiceAStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: ServiceAStackProps) {
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

export interface ServiceBStackProps extends cdk.StackProps {
  readonly bucketName: string; // Bucket to enable SNS notifications
}
export class ServiceBStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: ServiceBStackProps) {
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
