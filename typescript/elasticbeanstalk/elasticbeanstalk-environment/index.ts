#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CfnApplication, CfnEnvironment } from 'aws-cdk-lib/aws-elasticbeanstalk';
import { InstanceProfile, ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';


export class CdkStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //objects for access parameters
    const node = this.node;

    const appName = 'MyApp';
    const platform = node.tryGetContext("platform");
    const solution = node.tryGetContext("solution");


    // Create Role: 
    const ebRole = new Role(this, `${appName}-eb-role` , {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      roleName:`${appName}-eb-role`
    });
  
    // some managed policies eb must have
    ebRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWebTier'));
    ebRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkMulticontainerDocker'));
    ebRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWorkerTier'));

    //Custom policies
    //access to config secrets
  
    const roleARN = ebRole.roleArn;

   // Create instance profile
    const instanceProfile = new InstanceProfile(this, `${appName}-instance-role`, {
      role: ebRole,
      instanceProfileName: `${appName}-instance-role`,
    })

    const app = new CfnApplication(this, `${appName}-Application`, {
      applicationName: appName
    });

    const env = new CfnEnvironment(this, `${appName}-Environment`, {
      environmentName: `${appName}-Environment`,
      applicationName: appName,
      solutionStackName: solution,
      //platformArn: platform,
      optionSettings: [
        {
          namespace: "aws:autoscaling:launchconfiguration",
          optionName: "IamInstanceProfile",
          value: instanceProfile.instanceProfileArn,
        },
        {
          namespace: "aws:elasticbeanstalk:environment",
          optionName: "EnvironmentType",
          value: "SingleInstance", 
        },
      ]
    });

    // to ensure the application is created before the environment
    env.addDependency(app);
  }
}

const app = new cdk.App();

new CdkStack(app, 'ElasticBeanstalk');

app.synth();
