import * as cdk from 'aws-cdk-lib';
import { Construct } from "constructs";
import { lambdaApiStack } from './pipeline-app-lambda-api-stack';
import { ecsFargateStack } from './pipeline-app-ecs-fargate-stack';
import { asyncLambdaStack } from './pipeline-app-async-lambda-stack';

export class pipelineAppStage extends cdk.Stage {

    constructor(scope: Construct, id: string, props?: cdk.StageProps) {
      super(scope, id, props);

    const lambda_api_stack = new lambdaApiStack(this, 'LambdaApisStack');
    cdk.Tags.of(lambda_api_stack).add('managedBy',   'cdk');
    cdk.Tags.of(lambda_api_stack).add('environment', 'dev');

    const ecs_stack = new ecsFargateStack(this, 'EcsFargateStack');
    cdk.Tags.of(ecs_stack).add('managedBy',   'cdk');
    cdk.Tags.of(ecs_stack).add('environment', 'dev');
    
    const async_lambda_stack = new asyncLambdaStack(this, 'AsyncLambdasStack');
    cdk.Tags.of(async_lambda_stack).add('managedBy',   'cdk');
    cdk.Tags.of(async_lambda_stack).add('environment', 'dev');
    }
}