import events = require('aws-cdk-lib/aws-events');
import targets = require('aws-cdk-lib/aws-events-targets');
import lambda = require('aws-cdk-lib/aws-lambda');
import cdk = require('aws-cdk-lib');
import fs = require('fs');
import sns = require('aws-cdk-lib/aws-sns');
import subscriptions = require('aws-cdk-lib/aws-sns-subscriptions');
import iam = require('aws-cdk-lib/aws-iam');
import { CfnParameter } from 'aws-cdk-lib';



export class EventBridgeLambdaStack extends cdk.Stack {
  constructor(app: cdk.App, id: string) {
    super(app, id);

    // SNS Topic
    const topic = new sns.Topic(this, 'Topic', {
      displayName: 'Lambda SNS Topic',
    });

    //Email Variable
    const emailaddress = new CfnParameter(this, "email", {
      type: "String",
      description: "The name of the Amazon S3 bucket where uploaded files will be stored."});

    // Subscription to the topic
    topic.addSubscription(new subscriptions.EmailSubscription(emailaddress.valueAsString));

    // Lambda Function to publish message to SNS
    const lambdaFn = new lambda.Function(this, 'Singleton', {
      code: new lambda.InlineCode(fs.readFileSync('lambda-handler.py', { encoding: 'utf-8' })),
      handler: 'index.main',
      timeout: cdk.Duration.seconds(300),
      runtime: lambda.Runtime.PYTHON_3_9,
      environment: {'TOPIC_ARN': topic.topicArn}
      
    });

    // Run the eventbridge every minute
    const rule = new events.Rule(this, 'Rule', {
      schedule: events.Schedule.expression('cron(* * ? * * *)')
    });

    // Add the lambda function as a target to the eventbridge
    rule.addTarget(new targets.LambdaFunction(lambdaFn));

    // Add the permission to the lambda function to publish to SNS
    const snsTopicPolicy = new iam.PolicyStatement({
      actions: ['sns:publish'],
      resources: ['*'],
    });

    // Add the permission to the lambda function to publish to SNS
    lambdaFn.addToRolePolicy(snsTopicPolicy);

  }
}

const app = new cdk.App();
new EventBridgeLambdaStack(app, 'EventBridgeLambdaStack');
app.synth();
