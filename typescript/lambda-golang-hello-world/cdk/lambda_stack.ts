import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';

export class LambdaStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        new lambda.Function(this, "HelloWorldLambda", {
            runtime: lambda.Runtime.GO_1_X,
            code: lambda.Code.fromAsset("lambda_package"),
            handler: "hello-world",
        });
    }
}
