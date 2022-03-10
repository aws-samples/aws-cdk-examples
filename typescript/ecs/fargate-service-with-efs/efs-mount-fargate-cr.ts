import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cr from 'aws-cdk-lib/custom-resources';
import fs = require('fs');
import { Construct } from 'constructs';

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


export class FargateEfsCustomResource extends Construct {
  public readonly response: string;

  constructor(scope: Construct, id: string, props: FargateEfsCustomResourceProps) {
    super(scope, id);

    const onEvent = new lambda.SingletonFunction(this, 'Singleton', {
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
    });

    const myProvider = new cr.Provider(this, 'MyProvider', {
      onEventHandler: onEvent
    });

    const resource = new cdk.CustomResource(this, 'Resource1', {
      serviceToken: myProvider.serviceToken,
      properties: props
    });

    this.response = resource.getAtt('Response').toString();
  }
}
