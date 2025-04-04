import * as cdk from 'aws-cdk-lib';
import { EventBus, EventBusPolicy, Rule } from 'aws-cdk-lib/aws-events';
import { CloudWatchLogGroup } from 'aws-cdk-lib/aws-events-targets';
import { AccountPrincipal, Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface consumerStackProps extends cdk.StackProps {
  readonly appName:           string;
  readonly producerAccountId: string;
}

export class consumerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: consumerStackProps) {
    super(scope, id, props);

    // Create or reference the consumer event bus
    const consumerEventBus = new EventBus(this, `${props.appName}-consumer-event-bus`);

    // Add policy to allow producer account to put events
    consumerEventBus.addToResourcePolicy(new PolicyStatement({
      sid: 'allowProducerAccount',
      effect: Effect.ALLOW,
      principals: [new AccountPrincipal(props.producerAccountId)],
      actions: ['events:PutEvents'],
      resources: [consumerEventBus.eventBusArn]
    }));

    // Create consumer rules
    const consumerRule = new Rule(this, `${props.appName}-consumer-rule`, {
      eventBus: consumerEventBus,
      eventPattern: {
        // Define more specific filtering here
        source: ['com.myapp.events'],
        detail: {
          type: ['specific-event-type']
        }
      }
    });

    // Add target (e.g., CloudWatch)
    consumerRule.addTarget(new CloudWatchLogGroup(
      new LogGroup(this, `${props.appName}-consumer-logs`)
    ));
  }
}
