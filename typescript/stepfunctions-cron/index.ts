import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as sfnTasks from '@aws-cdk/aws-stepfunctions-tasks';
import * as events from '@aws-cdk/aws-events';
import * as targets from '@aws-cdk/aws-events-targets';
import fs = require('fs');

class StepFunctionsCronStack extends cdk.Stack {
  constructor(app: cdk.App, id: string) {
      super(app, id);

      /** ------------------ Lambda Handlers Definition ------------------ */

      const lambdaFirstFn = new lambda.Function(this, 'FirstHandler', {
        code: new lambda.InlineCode(fs.readFileSync('lambda-handler-first.py', { encoding: 'utf-8' })),
        handler: 'index.main',
        timeout: cdk.Duration.seconds(300),
        runtime: lambda.Runtime.PYTHON_3_6,
      });

      const lambdaSecondFn = new lambda.Function(this, 'SecondHandler', {
        code: new lambda.InlineCode(fs.readFileSync('lambda-handler-second.py', { encoding: 'utf-8' })),
        handler: 'index.main',
        timeout: cdk.Duration.seconds(300),
        runtime: lambda.Runtime.PYTHON_3_6,
      });

      /** ------------------ Step functions Definition ------------------ */

      const firstTask = new sfnTasks.LambdaInvoke(this, 'FirstTask', {
        lambdaFunction: lambdaFirstFn
      });  
      const waitTask = new sfn.Wait(this, 'Wait for something to finish', {
        time: sfn.WaitTime.duration(cdk.Duration.seconds(300)),
      });
      const secondTask = new sfnTasks.LambdaInvoke(this, 'FirstTask', {
        lambdaFunction: lambdaSecondFn
      });
      
      // Create chain
      const chain = sfn.Chain
        .start(firstTask)
        .next(waitTask)
        .next(secondTask);

      // Create state machine
      const stateMachine = new sfn.StateMachine(this, 'CronStateMachine', {
        definition: chain,
        timeout: cdk.Duration.seconds(300),
      });

      // Grant lambda execution roles
      lambdaFirstFn.grantInvoke(stateMachine.role);
      lambdaSecondFn.grantInvoke(stateMachine.role);

      /** ------------------ Events Rule Definition ------------------ */
      
      // Run every day at 6PM UTC
      // See https://docs.aws.amazon.com/lambda/latest/dg/tutorial-scheduled-events-schedule-expressions.html
      const rule = new events.Rule(this, 'Rule', {
        schedule: events.Schedule.expression('cron(0 18 ? * MON-FRI *)')
      });
  
      rule.addTarget(new targets.SfnStateMachine(stateMachine));
  }
}

const app = new cdk.App();
new StepFunctionsCronStack(app, 'StepFunctionsCronExample');
app.synth();
