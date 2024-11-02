import { PythonLayerVersion } from '@aws-cdk/aws-lambda-python-alpha';
import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime, Function, Alias } from 'aws-cdk-lib/aws-lambda';
import { FilterPattern, LogGroup, RetentionDays, SubscriptionFilter } from 'aws-cdk-lib/aws-logs';
import { LambdaDestination } from 'aws-cdk-lib/aws-logs-destinations';
import { Construct } from 'constructs';
import path = require('path');

export interface CWLogsSubscriptionStackProps extends StackProps {
  ingestionEndpointURL: string
}

export class CWLogsSubscriptionStack extends Stack {
    
    private readonly STACK_NAMING_PREFIX: string = 'cwlogs-subscription';
    
    constructor(scope: Construct, id: string, props: CWLogsSubscriptionStackProps) {
      super(scope, id, props);
  
        /////////////////////////////////////////////////////////////////////////////////
        //
        // Create the Log Emitter Lambda resources
        // 
        /////////////////////////////////////////////////////////////////////////////////
        const logGroup = new LogGroup(this, `EventBridgeTriggeredLambdaLogGroup`, {
          retention: RetentionDays.ONE_WEEK,
        });
    
        // Lambda Function to publish message
        const lambdaFn = new Function(this, 'EventBridgeTriggeredLambdaFunction', {
          code: Code.fromAsset(path.join(__dirname, '../resources/lambda/log_emitter')),
          handler: 'handler.log_emitter',
          timeout: Duration.seconds(300),
          runtime: Runtime.PYTHON_3_12,
          logGroup: logGroup
        });
    
        // Run the eventbridge every 5 minute interval to generate logs
        const rule = new Rule(this, 'Rule', {
          schedule: Schedule.rate(Duration.minutes(5))
        });
    
        // Add the lambda function as a target to the eventbridge
        rule.addTarget(new LambdaFunction(lambdaFn));
  
  
        /////////////////////////////////////////////////////////////////////////////////
        //
        // Create the CloudWatch Log group subscription filter resources
        // 
        /////////////////////////////////////////////////////////////////////////////////
  
        const lambdaLayer = new PythonLayerVersion(this, `${this.STACK_NAMING_PREFIX}LambdaLayer`, {
          entry: path.join(__dirname, "../resources/lambda/cw_subscription_filter/layers"),
          compatibleRuntimes: [
            Runtime.PYTHON_3_12,
            Runtime.PYTHON_3_11,
          ],
          description: "A layer that contains the required modules",
          license: "MIT License",
        });
    
        const lambdaFunction = new Function(this, `${this.STACK_NAMING_PREFIX}LambdaFunction`, {
            runtime: Runtime.PYTHON_3_12,
            code: Code.fromAsset(path.join(__dirname, '../resources/lambda/cw_subscription_filter')),
            handler: 'handler.cw_subscription_handler',
            layers: [lambdaLayer],
            environment: {
              OSI_INGESTION_ENDPOINT: props.ingestionEndpointURL,
            },
          }
        );
   
        new Alias(this, `${this.STACK_NAMING_PREFIX}LambdaFunctionAlias`, {
          aliasName: 'live',
          version: lambdaFunction.currentVersion,
        });
    
        lambdaFunction.addToRolePolicy(
          new PolicyStatement({
            effect: Effect.ALLOW,
            resources: ['*'],
            actions: ['osis:ingest'],
          }),
        );
  
        // Create a Lambda Subscription Filter on the specific log group created above
        const subscriptionFilter = new SubscriptionFilter(this, `${this.STACK_NAMING_PREFIX}LogSubscription`, {
          logGroup: logGroup,
          destination: new LambdaDestination(lambdaFunction),
          filterPattern: FilterPattern.allEvents(),
        });
        subscriptionFilter.node.addDependency(lambdaFunction);
      }
  
}
