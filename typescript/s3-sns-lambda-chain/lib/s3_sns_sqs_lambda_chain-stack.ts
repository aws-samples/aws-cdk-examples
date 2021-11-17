
import * as cdk from '@aws-cdk/core';
import * as sqs from '@aws-cdk/aws-sqs';
import * as sns from '@aws-cdk/aws-sns';
import * as s3 from '@aws-cdk/aws-s3';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaEvents from '@aws-cdk/aws-lambda-event-sources';
import * as snsSubscriptions from '@aws-cdk/aws-sns-subscriptions';
import * as s3Notifications from '@aws-cdk/aws-s3-notifications';
export class S3SnsSqsLambdaChainStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Note: A dead-letter queue is optional but it helps capture any failed messages
    const deadLetterQueue = new sqs.Queue(
        this,
        'deadLetterQueueId', {
          retentionPeriod: cdk.Duration.days(7)
        }
    );

    const uploadQueue = new sqs.Queue(
      this,
      'sampleQueueId', {
        visibilityTimeout: cdk.Duration.seconds(30),
        deadLetterQueue: {
          maxReceiveCount: 1,
          queue: deadLetterQueue
        }
      }
    );

    const sqsSubscription = new snsSubscriptions.SqsSubscription(
      uploadQueue, {
      rawMessageDelivery: true
    });

    const uploadEventTopic = new sns.Topic(
      this,
      'SampleSnsTopic'
    );

    // This binds the SNS Topic to the SQS Queue
    uploadEventTopic.addSubscription(sqsSubscription);

    
    // Note: Lifecycle Rules are optional but are included here to keep costs
    //       low by cleaning up old files or moving them to lower cost storage options
    const s3Bucket = new s3.Bucket(
      this,
      'sampleS3Bucket', {
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        versioned: true,
        lifecycleRules: [
          {
            enabled: true,
            expiration: cdk.Duration.days(365),
            transitions: [
              {
                storageClass: s3.StorageClass.INFREQUENT_ACCESS,
                transitionAfter: cdk.Duration.days(30)
              },
              {
                storageClass: s3.StorageClass.GLACIER,
                transitionAfter: cdk.Duration.days(90)
              }
            ]
          }
        ]

      }
    );

    // Note: If you don't specify a filter all uploads will trigger an event.
    //       Also, modifying the event type will handle other object operations
    // This binds the S3 bucket to the SNS Topic
    s3Bucket.addEventNotification(
        s3.EventType.OBJECT_CREATED_PUT,
        new s3Notifications.SnsDestination(uploadEventTopic),
        {
          prefix: 'uploads',
          suffix: '.csv'
        }
    );

    const lambdaFunction = new lambda.Function(
      this,
      'lambdaFunction', {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: 'lambda.handler',
        code: lambda.Code.fromAsset('lambda')
      }
    );

    // This binds the lambda to the SQS Queue
    const invokeEventSource = new lambdaEvents.SqsEventSource(uploadQueue);
    lambdaFunction.addEventSource(invokeEventSource);

  }
}