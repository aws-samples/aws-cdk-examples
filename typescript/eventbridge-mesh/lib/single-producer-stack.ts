import * as cdk from 'aws-cdk-lib';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface producerStackProps extends cdk.StackProps {
  readonly consumerAccountId: string;
}

export class producerStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: producerStackProps) {
      super(scope, id, props);
  
      // Create the EventBus
      const producerEventBus = new EventBus(this, 'ProducerEventBus');
  
      // Create rule to forward events to consumer account
      const rule = new Rule(this, 'ForwardToConsumerRule', {
        eventBus: producerEventBus,
        eventPattern: {
          // Define your event pattern here
          source: ['com.myapp.events'],
        },
      });
  
      // Add target to forward to consumer account's event bus
      rule.addTarget(new targets.EventBus(
        EventBus.fromEventBusArn(
          this, 
          'ConsumerEventBus',
          `arn:aws:events:${cdk.Stack.of(this).region}:${props.consumerAccountId}:event-bus/default`
        )
      ));
  
      // Optional: Add CloudWatch target for monitoring
      rule.addTarget(new targets.CloudWatchLogGroup(
        new LogGroup(this, 'producerLogs')
      ));
    }
  }
  