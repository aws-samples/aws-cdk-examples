import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Function, InlineCode, Runtime } from 'aws-cdk-lib/aws-lambda';
import { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway'

export class lambdaApiStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        //  create a lambda function
        const lambdaFunction = new Function(this, 'lambdaFunction', {
            runtime: Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: new InlineCode(`exports.handler = async (event) => {
    const response = {
        statusCode: 200,
        body: JSON.stringify('Hello from Lambda!'),
    };
    return response;
};`)
        });

        // create an API Gateway
        const api = new LambdaRestApi(this, 'ApiGateway', {
            handler: lambdaFunction,
            proxy: false,
        });

        // connect the lambda function to API Gateway
        api.root.addMethod("GET");

    }
}
