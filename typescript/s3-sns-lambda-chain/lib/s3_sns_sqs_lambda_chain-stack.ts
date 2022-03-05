import { App, Stack, StackProps, Duration } from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambdaEvents from 'aws-cdk-lib/aws-lambda-event-sources';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as s3Notifications from 'aws-cdk-lib/aws-s3-notifications';
import { join } from 'path'
export class S3SnsSqsLambdaChainStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    // Note: A dead-letter queue is optional but it helps capture any failed messages
    const deadLetterQueue = new sqs.Queue(
        this,
        'deadLetterQueueId', {
          retentionPeriod: Duration.days(7)
        }
    );

    const uploadQueue = new sqs.Queue(
      this,
      'sampleQueueId', {
        visibilityTimeout: Duration.seconds(30),
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
            expiration: Duration.days(365),
            transitions: [
              {
                storageClass: s3.StorageClass.INFREQUENT_ACCESS,
                transitionAfter: Duration.days(30)
              },
              {
                storageClass: s3.StorageClass.GLACIER,
                transitionAfter: Duration.days(90)
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


    const lambdaFunction = new lambdaNodejs.NodejsFunction(this, 'lambdaFunction', {
      entry: join(__dirname, '..', 'lambda', 'lambda.ts'),
      handler: 'lambda.handler'
    });

    // This binds the lambda to the SQS Queue
    const invokeEventSource = new lambdaEvents.SqsEventSource(uploadQueue);
    lambdaFunction.addEventSource(invokeEventSource);

  }
}
