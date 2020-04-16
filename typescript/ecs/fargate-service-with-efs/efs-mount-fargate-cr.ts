import cfn = require('@aws-cdk/aws-cloudformation');
import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/core');
import iam = require('@aws-cdk/aws-iam');

import fs = require('fs');

export interface FargateEfsCustomResourceProps {
  /**
   * Custom Resource Properties
   */
  TaskDefinition: string;
  EcsService: string;
  EcsCluster: string;
  EfsFileSystemId: string;
  EfsMountName: string
}


export class FargateEfsCustomResource extends cdk.Construct {
  public readonly response: string;

  constructor(scope: cdk.Construct, id: string, props: FargateEfsCustomResourceProps) {
    super(scope, id);

    const resource = new cfn.CustomResource(this, 'Resource', {
      provider: cfn.CustomResourceProvider.lambda(new lambda.SingletonFunction(this, 'Singleton', {
        uuid: 'f7d4f730-4ee1-11e8-9c2d-fa7ae01bbebc',
        code: new lambda.InlineCode(fs.readFileSync('lambda.js', { encoding: 'utf-8' })),
        handler: 'index.handler',
        timeout: cdk.Duration.seconds(300),
        runtime: lambda.Runtime.NODEJS_12_X,
        initialPolicy:[
            new iam.PolicyStatement({
              actions: [ 'ecs:UpdateService', 'ecs:RegisterTaskDefinition', 'ecs:DescribeTaskDefinition', 'iam:PassRole', 'iam:GetRole' ],
              resources: [ '*' ]
            })
        ]
      })),
      properties: props
    });

    this.response = resource.getAtt('Response').toString();
  }
}
