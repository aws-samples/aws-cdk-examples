import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CommonResources } from './common-resources';
import { OSCluster } from "./os-cluster";

export class OsVpcProvisionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.templateOptions.templateFormatVersion = '2010-09-09';

    const commonResources = new CommonResources(this, 'CommonResources', {});


    const osCluster = new OSCluster(this, "OSCluster", {
      vpc: commonResources.vpc,
      userPool: commonResources.cognitoUserPool,
      identityPool: commonResources.cognitoIdentityPool,
      identityPoolPolicy: commonResources.cognitoIdentityPoolPolicy,
      cognitoEndpoint: commonResources.cognitoEndpoint,
    });
  }
}
