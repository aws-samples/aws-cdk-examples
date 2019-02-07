import cfn = require('@aws-cdk/aws-cloudformation');
import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/cdk');

import fs = require('fs');

export interface MyCustomResourceProps {
  /**
   * Message to echo
   */
  message: string;
}

export class MyCustomResource extends cdk.Construct {
  public readonly response: string;

  constructor(scope: cdk.Construct, id: string, props: MyCustomResourceProps) {
    super(scope, id);

    const resource = new cfn.CustomResource(this, 'Resource', {
      lambdaProvider: new lambda.SingletonFunction(this, 'Singleton', {
        uuid: 'f7d4f730-4ee1-11e8-9c2d-fa7ae01bbebc',
        code: new lambda.InlineCode(fs.readFileSync('custom-resource-handler.py', { encoding: 'utf-8' })),
        handler: 'index.main',
        timeout: 300,
        runtime: lambda.Runtime.Python27,
      }),
      properties: props
    });

    this.response = resource.getAtt('Response').toString();
  }
}

