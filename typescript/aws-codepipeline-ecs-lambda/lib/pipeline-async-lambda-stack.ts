import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Function, InlineCode, Runtime } from 'aws-cdk-lib/aws-lambda';

export class asyncLambdaStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        new Function(this, 'lambdaFunction', {
            runtime: Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: new InlineCode('exports.handler = _ => "Hello, CDK";')
        });
    }
}