import { Template, Match } from '@aws-cdk/assertions';
import * as cdk from '@aws-cdk/core';
import * as S3SnsSqsLambdaChain from '../lib/s3_sns_sqs_lambda_chain-stack';

test('SNS Topic Created', () => {
  /*
  Test for SNS Topic and Subscription: S3 Upload Event Notification
  */

  const app = new cdk.App();
  const stack = new S3SnsSqsLambdaChain.S3SnsSqsLambdaChainStack(app, 'MyTestStack');
  const template = Template.fromStack(stack);
  
  template.resourceCountIs('AWS::SNS::Subscription', 1);
  template.resourceCountIs('AWS::SNS::Topic', 1);
  template.resourceCountIs('AWS::SNS::TopicPolicy', 1);
});

test('SQS Queue Created', () => {
  /*
  Test for SQS Queue:
    - Queue to process uploads
    - Dead-letter Queue
  */
 
  const app = new cdk.App();
  const stack = new S3SnsSqsLambdaChain.S3SnsSqsLambdaChainStack(app, 'MyTestStack');
  const template = Template.fromStack(stack);
  
  template.resourceCountIs('AWS::SQS::QueuePolicy', 1);
  template.resourceCountIs('AWS::SQS::Queue', 2);
});

test('S3 Bucket Created', () => {
  /*
  Test for S3 Bucket:
    - Upload Bucket
  */
 
  const app = new cdk.App();
  const stack = new S3SnsSqsLambdaChain.S3SnsSqsLambdaChainStack(app, 'MyTestStack');
  const template = Template.fromStack(stack);
  
  template.resourceCountIs('Custom::S3BucketNotifications', 1);
  template.resourceCountIs('AWS::S3::Bucket', 1);
});

test('Lambda Function Created', () => {
  /*
  Test for Lambdas created:
    - Sample Lambda
    - Bucket Notification Handler (automatically provisioned)
  */
 
  const app = new cdk.App();
  const stack = new S3SnsSqsLambdaChain.S3SnsSqsLambdaChainStack(app, 'MyTestStack');
  const template = Template.fromStack(stack);
  
  template.resourceCountIs('AWS::Lambda::Function', 2);
  template.resourceCountIs('AWS::Lambda::EventSourceMapping', 1);
});
