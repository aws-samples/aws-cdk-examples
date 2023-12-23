import { Duration, Stack, StackProps} from "aws-cdk-lib";
import { Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from 'constructs';

import { ScalableTarget, Schedule, ServiceNamespace } from 'aws-cdk-lib/aws-applicationautoscaling';
import { Metric }from 'aws-cdk-lib/aws-cloudwatch';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Alias } from 'aws-cdk-lib/aws-lambda';



interface LambdaPCScalingScheduleStackProps extends StackProps {
  functionName: string
}

export class LambdaPCScalingScheduleStack extends Stack {
  private lambdaFunction: Function
  private lambdaFunctionName: string

  constructor(scope: Construct, id: string, props: LambdaPCScalingScheduleStackProps) {
    super(scope, id, props);
    this.lambdaFunctionName = props.functionName

    // Create Sample Lambda Function which will create metrics
    this.lambdaFunction = new NodejsFunction(this, 'LambdaFunction', {
      functionName: this.lambdaFunctionName,
      entry: `./lambda/lambda-handler.ts`,
      runtime: Runtime.NODEJS_18_X,
      memorySize: 512,
      timeout: Duration.seconds(6),
    });
    // Enable Provisioned Concurrency
    new Alias(this, `LambdaFunctionAlias`, {
      aliasName: 'provisioned',
      version: this.lambdaFunction.currentVersion,
      provisionedConcurrentExecutions: 1,
    });
    // Enable AutoScaling Scalable Schedule
    const asg = new ScalableTarget(this, `${this.lambdaFunctionName}ScalableSchedule`, {
      serviceNamespace: ServiceNamespace.LAMBDA,
      maxCapacity: 1,
      minCapacity: 0,
      resourceId: `function:${this.lambdaFunctionName}:provisioned`,
      scalableDimension: 'lambda:function:ProvisionedConcurrency',
    })
    // Scaling out every weekday (Monday through Friday) at 11:00 AM(UTC+0),
    asg.scaleOnSchedule(`${this.lambdaFunctionName}ScheduleScaleOut`, {
      schedule: Schedule.expression('cron(0 11 ? * MON-FRI *))'), 
      minCapacity: 1,
      maxCapacity: 1
    })
    // Scaling in every weekday (Monday through Friday) at 12:00 AM(UTC+0),
    asg.scaleOnSchedule(`${this.lambdaFunctionName}ScheduleScaleIn`, {
      schedule: Schedule.expression('cron(0 12 ? * MON-FRI *))'),  
      minCapacity: 0,
      maxCapacity: 0
    })
  };
}
