import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import { LambdaCronStack } from './index';
import * as cdk from 'aws-cdk-lib';

const app = new cdk.App();
const stack = new LambdaCronStack(app, 'testStack');
const assert = Template.fromStack(stack);

describe('lambda tests', () => {
  test('specified resources created', () => {
    assert.resourceCountIs('AWS::Lambda::Function', 1);
    assert.resourceCountIs('AWS::Events::Rule', 1);
  });

  test('lambda function has correct properties', () => {
    const dependencyCapture = new Capture();
    assert.hasResource('AWS::Lambda::Function', {
      Properties: {
        Code: {
          ZipFile: `def main(event, context):\n    print(\"I'm running!\")`,
        },
        Handler: 'index.main',
        Runtime: 'python3.9',
        Timeout: 300,
      },
      DependsOn: [ dependencyCapture ],
    });

    expect(dependencyCapture.asString().match(/SingletonServiceRole/)).toBeDefined();
  });

  test('lambda has correct iam permissions', () => {
    const roleCapture = new Capture();
    assert.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: Match.objectLike({
        Statement: [{
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: {
            Service: 'lambda.amazonaws.com'
          },
        }],
      }),
      ManagedPolicyArns: [{
        'Fn::Join': Match.arrayWith([
          [ 'arn:', { 'Ref': 'AWS::Partition' }, roleCapture ],
        ]),
      }],
    });

    expect(roleCapture.asString().match(/AWSLambdaBasicExecutionRole/)).toBeDefined();
  });

  test('lambda not running in vpc', () => {
    assert.hasResource('AWS::Lambda::Function', {
      Vpc: Match.absent(),
    });
  });
});

describe('events tests', () => {
  test('event has correct rule', () => {
    assert.hasResourceProperties('AWS::Events::Rule', {
      ScheduleExpression: 'cron(0 18 ? * MON-FRI *)',
      State: 'ENABLED',
      Targets: Match.anyValue(),
    });
  });
});
