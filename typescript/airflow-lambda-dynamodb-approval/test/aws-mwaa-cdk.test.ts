import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as AwsMwaaCdk from '../lib/aws-mwaa-cdk-stack';

test('MWAA Stack Resources Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new AwsMwaaCdk.AwsMwaaCdkStack(app, 'MyTestStack');
  // THEN
  const template = Template.fromStack(stack);

  // Test S3 bucket for DAGs is created
  template.resourceCountIs('AWS::S3::Bucket', 1);
  
  // Test MWAA environment is created
  template.resourceCountIs('AWS::MWAA::Environment', 1);
  
  // Test VPC is created
  template.resourceCountIs('AWS::EC2::VPC', 1);
  
  // Test DynamoDB table for approval workflow is created
  template.resourceCountIs('AWS::DynamoDB::Table', 1);
  
  // Test our demo Lambda function is created (CDK creates additional Lambda functions for infrastructure)
  template.hasResourceProperties('AWS::Lambda::Function', {
    FunctionName: 'mwaa-demo-function'
  });
  
  // Test IAM role for MWAA execution is created (CDK creates additional roles for infrastructure)
  template.hasResourceProperties('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Effect: 'Allow',
          Principal: {
            Service: 'airflow-env.amazonaws.com'
          },
          Action: 'sts:AssumeRole'
        }
      ]
    }
  });
  
  // Test security group is created
  template.resourceCountIs('AWS::EC2::SecurityGroup', 1);
});

test('MWAA Environment Configuration', () => {
  const app = new cdk.App();
  const stack = new AwsMwaaCdk.AwsMwaaCdkStack(app, 'MyTestStack');
  const template = Template.fromStack(stack);

  // Test MWAA environment has correct configuration
  template.hasResourceProperties('AWS::MWAA::Environment', {
    Name: 'MyMWAAEnvironment',
    EnvironmentClass: 'mw1.small',
    MinWorkers: 1,
    MaxWorkers: 2,
    AirflowVersion: '2.7.2',
    WebserverAccessMode: 'PUBLIC_ONLY'
  });
});

test('DynamoDB Table Configuration', () => {
  const app = new cdk.App();
  const stack = new AwsMwaaCdk.AwsMwaaCdkStack(app, 'MyTestStack');
  const template = Template.fromStack(stack);

  // Test DynamoDB table configuration for approval workflow
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [{
      AttributeName: 'id',
      KeyType: 'HASH'
    }]
  });
});

test('Lambda Function Configuration', () => {
  const app = new cdk.App();
  const stack = new AwsMwaaCdk.AwsMwaaCdkStack(app, 'MyTestStack');
  const template = Template.fromStack(stack);

  // Test Lambda function configuration
  template.hasResourceProperties('AWS::Lambda::Function', {
    FunctionName: 'mwaa-demo-function',
    Runtime: 'python3.9',
    Handler: 'index.lambda_handler'
  });
});

test('S3 Bucket Configuration', () => {
  const app = new cdk.App();
  const stack = new AwsMwaaCdk.AwsMwaaCdkStack(app, 'MyTestStack');
  const template = Template.fromStack(stack);

  // Test S3 bucket has versioning enabled
  template.hasResourceProperties('AWS::S3::Bucket', {
    VersioningConfiguration: {
      Status: 'Enabled'
    }
  });
});
