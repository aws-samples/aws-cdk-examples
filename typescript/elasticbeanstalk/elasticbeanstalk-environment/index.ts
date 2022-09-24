#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as elasticbeanstalk from 'aws-cdk-lib/aws-elasticbeanstalk';
// import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';


export class CdkStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //objects for access parameters
    const node = this.node;

    const appName = 'MyApp';

    const solutionStack = node.tryGetContext("solutionStack");

    const app = new elasticbeanstalk.CfnApplication(this, 'Application', {
      applicationName: appName
    });

    // Uncomment the following lines to create the aws-elasticbeanstalk-ec2-role
    // const elasticbeanstalkEc2Role = new Role(this, 'ElasticBeanstalkInstanceRole', {
    //   roleName: 'aws-elasticbeanstalk-ec2-role',
    //   managedPolicies: [
    //     ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWebTier'),
    //     ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
    //     ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanStalkMulticontainerDocker'),
    //     ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWorkerTier'),
    //   ],
    //   assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
    // })

    const env = new elasticbeanstalk.CfnEnvironment(this, 'Environment', {
      environmentName: 'MySampleEnvironment',
      applicationName: app.applicationName || appName,
      solutionStackName: solutionStack,
      optionSettings: [{
        namespace: 'aws:autoscaling:launchconfiguration',
        optionName: 'IamInstanceProfile',
        value: 'aws-elasticbeanstalk-ec2-role',
      }]
    });

    // to ensure the application is created before the environment
    env.addDependsOn(app);
  }
}

const app = new cdk.App();

new CdkStack(app, 'ElasticBeanstalk');

app.synth();
