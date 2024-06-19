import * as cdk from 'aws-cdk-lib';
import { Construct } from "constructs";
import { lambdaApiStack } from './pipeline-lambda-api-stack';
import { ecsPatternsStack } from './pipeline-ecs-fargate-stack';
import { asyncLambdaStack } from './pipeline-async-lambda-stack';

export class pipelineAppStage extends cdk.Stage {

    constructor(scope: Construct, id: string, props?: cdk.StageProps) {
      super(scope, id, props);

    const lambda_api_stack = new lambdaApiStack(this, 'lambdaStack');
    cdk.Tags.of(lambda_api_stack).add('managedBy',   'cdk');
    cdk.Tags.of(lambda_api_stack).add('environment', 'dev');

    const ecs_stack = new ecsPatternsStack(this, 'ecsPatternsStack');
    cdk.Tags.of(ecs_stack).add('managedBy',   'cdk');
    cdk.Tags.of(ecs_stack).add('environment', 'dev');
    
    const async_lambda_stack = new asyncLambdaStack(this, 'asyncLambdaStack');
    cdk.Tags.of(async_lambda_stack).add('managedBy',   'cdk');
    cdk.Tags.of(async_lambda_stack).add('environment', 'dev');
    }
}