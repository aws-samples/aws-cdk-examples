import * as cdk from 'aws-cdk-lib';
import {Match, Template} from 'aws-cdk-lib/assertions';
import {DemoAuroraEventualDataLoadStack} from '../lib/demo-aurora-eventual-data-load-stack';

describe('DemoAuroraEventualDataLoadStack', () => {
  let app: cdk.App;
  let stack: DemoAuroraEventualDataLoadStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new DemoAuroraEventualDataLoadStack(app, 'TestStack');
    template = Template.fromStack(stack);
  });

  test('S3 bucket is created with correct configuration', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: {
        'Fn::Join': [
          '',
          [
            'data-bucket-',
            {Ref: 'AWS::AccountId'}
          ]
        ]
      }
    });
  });

  test('VPC is created with correct configuration', () => {
    template.hasResourceProperties('AWS::EC2::VPC', {
      EnableDnsHostnames: true,
      EnableDnsSupport: true,
      Tags: [
        {
          Key: 'Name',
          Value: 'demo-aurora-eventual-load-vpc'
        }
      ]
    });

    // Verify subnet configuration
    template.resourceCountIs('AWS::EC2::Subnet', 4); // 2 public + 2 private subnets
  });

  test('Security groups are created with correct rules', () => {
    // Database security group
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupName: 'demo-database-sg',
      SecurityGroupIngress: Match.arrayWith([
        Match.objectLike({
          FromPort: 3306,
          IpProtocol: 'tcp',
          ToPort: 3306
        })
      ])
    });

    // Lambda security group
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupName: 'demo-lambda-sg',
      SecurityGroupEgress: [
        {
          CidrIp: '0.0.0.0/0',
          Description: 'Allow all outbound traffic by default',
          IpProtocol: '-1'
        }
      ]
    });
  });

  test('Aurora cluster is created with correct configuration', () => {
    template.hasResourceProperties('AWS::RDS::DBCluster', {
      Engine: 'aurora-mysql',
      DatabaseName: 'demo',
      DBClusterIdentifier: 'demo-aurora-eventual-load',
      DeletionProtection: false,
    });
  });

  test('SQS queues are created with correct configuration', () => {
    // Main queue
    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'demo-data-load',
      MessageRetentionPeriod: 172800, // 2 days
      VisibilityTimeout: 30
    });

    // DLQ
    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'demo-data-load-dlq',
      MessageRetentionPeriod: 172800,
      VisibilityTimeout: 15
    });
  });

  test('Lambda function is created with correct configuration', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'demo-aurora-eventual-data-load-function',
      Handler: 'data-load-function.handler',
      Runtime: 'python3.12',
      MemorySize: 512,
      Timeout: 15,
      Architectures: ['arm64'],
      VpcConfig: Match.anyValue(),
      Layers: Match.arrayWith([
        Match.objectLike({
          Ref: Match.stringLikeRegexp('^PyMysqlLayer*')
        }),
        'arn:aws:lambda:us-east-1:017000801446:layer:AWSLambdaPowertoolsPythonV2-Arm64:78'
      ])
    });
  });

  test('CloudWatch alarm is created with correct configuration', () => {
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'demo-aurora-eventual-load-dlq-alarm',
      AlarmDescription: 'Alarm triggered during the LOAD process',
      EvaluationPeriods: 1,
      DatapointsToAlarm: 1,
      Threshold: 0,
      ComparisonOperator: 'GreaterThanThreshold'
    });
  });

  test('SNS topic is created', () => {
    template.hasResourceProperties('AWS::SNS::Topic', {
      TopicName: 'demo-aurora-eventual-load-notification'
    });
  });

});
