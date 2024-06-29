import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as events from 'aws-cdk-lib/aws-events';
import * as eventsTargets from 'aws-cdk-lib/aws-events-targets';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { SnsEventSource, SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as path from 'path';
import { Function, Code, Runtime } from 'aws-cdk-lib/aws-lambda';

export class asyncLambdaStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // EventBridge event as an event source for a SNS topic and a SQS queue
        const rule = new events.Rule(this, 'Rule', {
            eventPattern: {
                source: ['aws.ecs']
            }
        });

        // Shared code asset
        const code = Code.fromAsset(path.join(__dirname, '../assets/lambda-functions'));

        // Lambda Function that will be invoked asynchronously when there is any event that matches the rule
        const eventsFunction = new Function(this, 'EventFunction', {
            runtime: Runtime.NODEJS_20_X,
            code,
            handler: 'events_handler.handler'
        });
        const eventsDLQ = new sqs.Queue(this, 'LambdaDLQ');
        rule.addTarget(new eventsTargets.LambdaFunction(eventsFunction, {
            deadLetterQueue: eventsDLQ,
            maxEventAge: cdk.Duration.minutes(2),
            retryAttempts: 2
        }));

        // Lambda Function that will be invoked asynchronously by a SNS topic
        const topic = new sns.Topic(this, 'Topic');
        rule.addTarget(new eventsTargets.SnsTopic(topic, {
            deadLetterQueue: eventsDLQ,
            maxEventAge: cdk.Duration.minutes(2),
            retryAttempts: 2
        }));

        const topicFunction = new Function(this, 'TopicLambdaFunction', {
            runtime: Runtime.NODEJS_20_X,
            code,
            handler: 'topic_message_handler.handler'
        });
        const topicDLQ = new sqs.Queue(this, 'TopicDLQ');
        topicFunction.addEventSource(new SnsEventSource(topic, {
            deadLetterQueue: topicDLQ
        }));

        // Lambda Function that will be invoked asynchronously with the event source of a SQS queue
        const queue = new sqs.Queue(this, 'JobQueue');
        rule.addTarget(new eventsTargets.SqsQueue(queue, {
            deadLetterQueue: eventsDLQ,
            maxEventAge: cdk.Duration.minutes(2),
            retryAttempts: 2
        }));

        const queueFunction = new Function(this, 'QueueLambdaFunction', {
            runtime: Runtime.NODEJS_20_X,
            code,
            handler: 'queue_message_handler.handler'
        });
        queueFunction.addEventSource(new SqsEventSource(queue, {
            batchSize: 5,
            maxBatchingWindow: cdk.Duration.seconds(5),
            reportBatchItemFailures: true
        }));
    }
}