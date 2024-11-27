import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as ddbStream from '../lib/ddb-stream-stack';

const app = new cdk.App();
const stack = new ddbStream.DdbStreamStack(app, 'MyTestStack');
const template = Template.fromStack(stack);

test('DynamoDB Table, Lambda Function, and SNS Topic Created', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
        StreamSpecification: {
            StreamViewType: 'NEW_AND_OLD_IMAGES',
        }
    });
    template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'nodejs20.x',
        Handler: 'index.handler',

    });
    template.hasResourceProperties('AWS::SNS::Topic', {
        KmsMasterKeyId: Match.anyValue(),
    });
});

test('Lambda Function has permission to publish to SNS', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
            Statement: Match.arrayWith([
                Match.objectLike({
                    Effect: 'Allow',
                    Action: 'sns:Publish',
                    Resource: Match.anyValue()
                })
            ])
        }
    });
});

test('Lambda Function has correct environment variables', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
            Variables: {
                SNS_TOPIC_ARN: Match.anyValue()
            }
        }
    });
});


test('Lambda Functions have DynamoDB Stream Event Sources', () => {
    template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
        BatchSize: 100,
        EventSourceArn: {
            'Fn::GetAtt': [Match.anyValue(), 'StreamArn']
        },
        FunctionName: {
            Ref: Match.anyValue()
        },
        StartingPosition: 'TRIM_HORIZON'
    });
});

test('DLQ is created for Lambda functions', () => {
    template.hasResourceProperties('AWS::SQS::Queue', {
        KmsMasterKeyId: Match.anyValue()
    });
});


test('Stack has the correct number of resources', () => {
    template.resourceCountIs('AWS::DynamoDB::Table', 2);
    template.resourceCountIs('AWS::Lambda::Function', 2);
    template.resourceCountIs('AWS::SNS::Topic', 1);
    template.resourceCountIs('AWS::SQS::Queue', 2);
    template.resourceCountIs('AWS::Lambda::EventSourceMapping', 2);
});

