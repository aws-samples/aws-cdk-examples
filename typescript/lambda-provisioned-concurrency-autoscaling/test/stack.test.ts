import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { LambdaPCScalingTargetStack } from '../lib/lambda-pc-autoscaling-target';
import { LambdaPCScalingScheduleStack } from '../lib/lambda-pc-autoscaling-schedule';

describe('CDK Stack Testing', () => {
  test('Lambda Function PC Scaling Target Testing', () => {
    const app = new App();
    // WHEN
    const LambdaPCScalingTargetstack = new LambdaPCScalingTargetStack(app, 'LambdaPCScalingTargetStackTest', {
        functionName: `LambdaPCScalingTargetStackTesting`,
      }
    );
    const targetAssert = Template.fromStack(LambdaPCScalingTargetstack);
    // THEN
    targetAssert.resourceCountIs('AWS::Lambda::Function', 1);
  });

  test('Lambda Function PC Scaling Schedule Testing', () => {
    const app = new App();
    // WHEN
    const LambdaPCScalingSchedulestack = new LambdaPCScalingScheduleStack(app, 'LambdaPCScalingScheduleStackTest', {
        functionName: `LambdaPCScalingScheduleStackTesting`,
      }
    );
    // THEN
    const scheduleAssert = Template.fromStack(LambdaPCScalingSchedulestack);
    scheduleAssert.resourceCountIs('AWS::Lambda::Function', 1);
  });
});

