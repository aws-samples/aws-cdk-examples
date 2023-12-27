import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SampleLambdaConstruct } from './sample-construct';
import { DefaultReservedConcurrentExecutions } from './lambda-aspect';

export class SampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new SampleLambdaConstruct(this, 'Construct1');

    /**
     * Let assume our SampleLambdaConstruct is provided by a 3rd party.
     * In this case, the construct does not allow us to configure the lambda reserved concurrent executions.
     * No problem! We can use our aspect to set default reserved concurrent executions for all lambda functions in the construct.
     */
    const construct2 = new SampleLambdaConstruct(this, 'Construct2');
    cdk.Aspects.of(construct2).add(
      new DefaultReservedConcurrentExecutions(1)
    );
  }
}
