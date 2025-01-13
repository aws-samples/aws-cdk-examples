import * as cdk from 'aws-cdk-lib';
import { Construct } from "constructs";
import { vpcStack } from './stage-app-vpc-stack';
import { lambdaApiStack } from './stage-app-lambda-api-stack';
import { ecsFargateStack } from './stage-app-ecs-fargate-stack';
import { asyncLambdaStack } from './stage-app-async-lambda-stack';
import { rdsAuroraStack } from './stage-app-datastore-stack';

export class pipelineAppStage extends cdk.Stage {

    constructor(scope: Construct, id: string, props?: cdk.StageProps) {
      super(scope, id, props);

    // 👇 vpc stack 👇
    const vpc_stack = new vpcStack(this, 'VpcStack');
    cdk.Tags.of(vpc_stack).add('managedBy',   'cdk');
    cdk.Tags.of(vpc_stack).add('environment', 'dev');

    // 👇 lambda api stack 👇
    const lambda_api_stack = new lambdaApiStack(this, 'LambdaApisStack');
    cdk.Tags.of(lambda_api_stack).add('managedBy',   'cdk');
    cdk.Tags.of(lambda_api_stack).add('environment', 'dev');

    // 👇 ecs fargate stack 👇
    const ecs_fargate_stack = new ecsFargateStack(this, 'EcsFargateStack', {
      vpc: vpc_stack.vpc,
    });
    cdk.Tags.of(ecs_fargate_stack).add('managedBy',   'cdk');
    cdk.Tags.of(ecs_fargate_stack).add('environment', 'dev');

    // 👇 async lambda stack 👇
    const async_lambda_stack = new asyncLambdaStack(this, 'AsyncLambdasStack');
    cdk.Tags.of(async_lambda_stack).add('managedBy',   'cdk');
    cdk.Tags.of(async_lambda_stack).add('environment', 'dev');
    
    const rds_aurora_stack = new rdsAuroraStack(this, 'rdsAuroraStack', {
      vpc: vpc_stack.vpc,
    });
    cdk.Tags.of(rds_aurora_stack).add('managedBy',   'cdk');
    cdk.Tags.of(rds_aurora_stack).add('environment', 'dev');
    }
}