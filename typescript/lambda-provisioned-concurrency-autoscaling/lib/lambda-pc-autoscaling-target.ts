import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from 'constructs';

import { ScalableTarget, ServiceNamespace } from 'aws-cdk-lib/aws-applicationautoscaling';
import { Metric }from 'aws-cdk-lib/aws-cloudwatch';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import {  Alias } from 'aws-cdk-lib/aws-lambda';




interface LambdaPCScalingTargetStackProps extends StackProps {
  functionName: string
}

export class LambdaPCScalingTargetStack extends Stack {
  private lambdaFunction: Function
  private lambdaFunctionName: string

  constructor(scope: Construct, id: string, props: LambdaPCScalingTargetStackProps) {
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
    // Create Metric of Lambda Provisioned Concurrency 
    const metrics = new Metric({
      metricName: 'ProvisionedConcurrencyUtilization',
      namespace: 'AWS/Lambda',
      dimensionsMap: {
        FunctionName: this.lambdaFunction.functionName,
        Resource: `${this.lambdaFunction.functionName}:'provisioned`,
      },
      statistic: 'Maximum',
      period: Duration.minutes(5),
    });
    // Enable AutoScaling Scalable Target when over target threshold(0.8)
    new ScalableTarget(this, `${this.lambdaFunctionName}ScalableTarget`, {
      serviceNamespace: ServiceNamespace.LAMBDA,
      maxCapacity: 2,
      minCapacity: 1,
      resourceId: `function:${this.lambdaFunctionName}:provisioned`,
      scalableDimension: 'lambda:function:ProvisionedConcurrency',
    }).scaleToTrackMetric(`${this.lambdaFunctionName}PCScaleTracking`, {
      targetValue: 0.8,
      customMetric: metrics,
    });
  };
}
