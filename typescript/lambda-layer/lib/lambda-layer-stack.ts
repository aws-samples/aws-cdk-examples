import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';

export class LambdaLayerStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const layer = new lambda.LayerVersion(this, 'HelperLayer', {
      code: lambda.Code.fromAsset('resources/layers/helper'),
      description: 'Common helper utility',
      compatibleRuntimes: [lambda.Runtime.NODEJS_14_X],
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const fn = new lambda.Function(this, 'LambdaFunction', {
        runtime: lambda.Runtime.NODEJS_14_X,
        code: lambda.Code.fromAsset('resources/lambda'),
        handler: 'index.handler',
        layers: [layer]
      }
    );
  }
}
