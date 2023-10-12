import { Template } from 'aws-cdk-lib/assertions';
import { App } from 'aws-cdk-lib';
import S3SnsSqsLambdaChainStack from '../lib/s3-sns-sqs-lambda-chain-stack';

/*
Test for SNS Topic and Subscription: S3 Upload Event Notification
*/
test('SNS Topic Created', () => {
  const app = new App();

  const stack = new S3SnsSqsLambdaChainStack(app, 'MyTestStack');

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::SNS::Subscription', 1);
  template.resourceCountIs('AWS::SNS::Topic', 1);
  template.resourceCountIs('AWS::SNS::TopicPolicy', 1);
});

/*
Test for SQS Queue:
  - Queue to process uploads
  - Dead-letter Queue
*/
test('SQS Queue Created', () => {
  const app = new App();

  const stack = new S3SnsSqsLambdaChainStack(app, 'MyTestStack');

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::SQS::QueuePolicy', 1);
  template.resourceCountIs('AWS::SQS::Queue', 2);
});

/*
Test for S3 Bucket:
  - Upload Bucket
*/
test('S3 Bucket Created', () => {
  const app = new App();

  const stack = new S3SnsSqsLambdaChainStack(app, 'MyTestStack');

  const template = Template.fromStack(stack);
  template.resourceCountIs('Custom::S3BucketNotifications', 1);
  template.resourceCountIs('AWS::S3::Bucket', 1);
});

/*
Test for Lambdas created:
  - Sample Lambda
  - Bucket Notification Handler (automatically provisioned)
  - Bucket Auto Delete (automatically provisioned)
*/
test('Lambda Function Created', () => {
  const app = new App();

  const stack = new S3SnsSqsLambdaChainStack(app, 'MyTestStack');

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Lambda::Function', 3);
  template.resourceCountIs('AWS::Lambda::EventSourceMapping', 1);
});
