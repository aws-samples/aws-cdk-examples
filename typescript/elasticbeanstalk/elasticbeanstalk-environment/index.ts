#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as elasticbeanstalk from 'aws-cdk-lib/aws-elasticbeanstalk';


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

    const env = new elasticbeanstalk.CfnEnvironment(this, 'Environment', {
      environmentName: 'MySampleEnvironment',
      applicationName: app.applicationName || appName,
      platformArn: platform
    });

    // to ensure the application is created before the environment
    env.addDependsOn(app);
  }
}

const app = new cdk.App();

new CdkStack(app, 'ElasticBeanstalk');

app.synth();
