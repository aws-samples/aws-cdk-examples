import { Construct } from 'constructs';
import {
    aws_lambda as lambda
} from 'aws-cdk-lib';

export class SampleLambdaConstruct extends Construct {
    constructor(scope: Construct, id: string){
        super(scope, id);

        const lambdaProps: lambda.FunctionProps = {
            handler: 'index.handler',
            code: lambda.Code.fromInline('export function handler(event, context){}'),
            runtime: lambda.Runtime.NODEJS_18_X,
        }

        new lambda.Function(this, 'StandardFunction', lambdaProps);

        new lambda.Function(this, 'FunctionWithReservedCEs', {
            ...lambdaProps,
            //Our aspect should not update this value, based on the logic in our "visit" method
            reservedConcurrentExecutions: 10,
        });
    }
}
