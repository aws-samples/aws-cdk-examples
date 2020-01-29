#!/usr/bin/env node
import cdk = require('@aws-cdk/core');
import elasticbeanstalk = require('@aws-cdk/aws-elasticbeanstalk');


export class CdkStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //objects for access parameters
    const node = this.node;

    const appName = 'MyApp';

    const platform = node.tryGetContext("platform");

    const app = new elasticbeanstalk.CfnApplication(this, 'Application', {
      applicationName: appName
    });

    new elasticbeanstalk.CfnEnvironment(this, 'Environment', {
      environmentName: 'MySampleEnvironment',
      applicationName: app.applicationName || appName,
      platformArn: platform
    });
  }
}

const app = new cdk.App();

new CdkStack(app, 'ElasticBeanstalk');

app.synth();