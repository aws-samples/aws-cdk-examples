import * as cdk from 'aws-cdk-lib';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { CloudWatchLogGroup } from 'aws-cdk-lib/aws-events-targets';
import { AccountPrincipal, Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface producerStackProps extends cdk.StackProps {
  readonly appName:          string;
  readonly consumerAccounts: string[];
}

export interface consumerStackProps extends cdk.StackProps {
  readonly appName:           string;
  readonly consumerName:      string;
  readonly producerAccountId: string;
}

export class producerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: producerStackProps) {
    super(scope, id, props);

    // Create the EventBus
    const producerEventBus = new EventBus(this, `${props.appName}-producer-event-bus`);

    props.consumerAccounts.forEach((consumerAccountId, index) => { 
    // Create rule to forward events to consumer account
    const rule = new Rule(this, `${props.appName}-forward-to-consumer-${index + 1}-rule`, {
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
        `${props.appName}-consumer-${index + 1}-event-bus`,
        `arn:aws:events:${cdk.Stack.of(this).region}:${consumerAccountId}:event-bus/default`
      )
    ));
  });
  }
}

export class consumerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: consumerStackProps) {
    super(scope, id, props);

    // Create or reference the consumer event bus
    const consumerEventBus = new EventBus(this, `${props.appName}-${props.consumerName}-event-bus`);

    // Add policy to allow producer account to put events
    consumerEventBus.addToResourcePolicy(new PolicyStatement({
      sid: 'allowProducerAccount',
      effect: Effect.ALLOW,
      principals: [new AccountPrincipal(props.producerAccountId)],
      actions: ['events:PutEvents'],
      resources: [consumerEventBus.eventBusArn]
    }));

    // Create consumer rules
    const consumerRule = new Rule(this, `${props.appName}-${props.consumerName}-rule`, {
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
      new LogGroup(this, `${props.appName}-${props.consumerName}-logs`)
    ));
  }
}

const app = new cdk.App();
const appName = app.node.tryGetContext('appName');
const region  = app.node.tryGetContext('region');
const producerAccountId  = app.node.tryGetContext('producerAccountId');
const consumer1AccountId = app.node.tryGetContext('consumer1AccountId');
const consumer2AccountId = app.node.tryGetContext('consumer2AccountId');

new producerStack(app, `${appName}-producer-stack`, {
  env: {
    account: producerAccountId,
    region:  region,
  },
  appName,
  consumerAccounts: [consumer1AccountId, consumer2AccountId],
});

// Deploy consumer 1 stack
new consumerStack(app, `${appName}-consumer1-stack`, {
  env: {
    account: consumer1AccountId,
    region: region,
  },
  appName,
  producerAccountId,
  consumerName: 'consumer1'
});

// Deploy consumer 2 stack
new consumerStack(app, `${appName}-consumer2-stack`, {
  env: {
    account: consumer2AccountId,
    region: region,
  },
  appName,
  producerAccountId,
  consumerName: 'consumer2'
});

app.synth();
