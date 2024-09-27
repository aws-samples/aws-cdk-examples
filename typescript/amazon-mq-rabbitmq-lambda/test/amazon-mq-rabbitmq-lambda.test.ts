import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as AmazonMqRabbitmqLambda from '../lib/amazon-mq-rabbitmq-lambda-stack';

test('RabbitMQ Broker and Lambda Function Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new AmazonMqRabbitmqLambda.AmazonMqRabbitmqLambdaStack(app, 'MyTestStack');
  // THEN
  const template = Template.fromStack(stack);

  // Check that RabbitMQ Broker instance is created with the correct properties
  template.hasResourceProperties('AWS::AmazonMQ::Broker', {
    EngineType: 'RABBITMQ', // Corrected to match actual output (uppercase)
    PubliclyAccessible: true,
    AutoMinorVersionUpgrade: true,
  });

  // Check that a Lambda function is created
  template.hasResourceProperties('AWS::Lambda::Function', {
    Runtime: 'nodejs20.x',
    MemorySize: 128,
    Timeout: 30,
  });

  // Check that the Secret for admin credentials is created
  template.hasResourceProperties('AWS::SecretsManager::Secret', {
    Name: 'AdminCredentials'
  });

  // Verify that the custom CloudWatch Log Group for the Lambda function is created
  template.hasResourceProperties('AWS::Logs::LogGroup', {
    LogGroupName: 'customLogGroup'
  });
});
