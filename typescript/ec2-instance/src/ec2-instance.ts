/* eslint-disable import/no-extraneous-dependencies */
import { App, Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { config } from 'dotenv';
import { VPCResources, ServerResources } from '.';
import { envValidator } from './envValidator';

config();

export interface EC2ExampleProps extends StackProps {
  logLevel: string;
  sshPubKey: string;
  cpuType: string;
  instanceSize: string;
}

export class EC2Example extends Stack {
  constructor(scope: Construct, id: string, props: EC2ExampleProps) {
    super(scope, id, props);

    const { logLevel, sshPubKey, cpuType, instanceSize } = props;

    envValidator(props);

    // Create VPC and Security Group
    const vpcResources = new VPCResources(this, 'VPC');

    // Create EC2 Instance
    // We will pass props to ServerResources to create the EC2 instance
    const serverResources = new ServerResources(this, 'EC2', {
      vpc: vpcResources.vpc,
      sshSecurityGroup: vpcResources.sshSecurityGroup,
      logLevel: logLevel,
      sshPubKey: sshPubKey,
      cpuType: cpuType,
      instanceSize: instanceSize.toLowerCase(),
    });

    // SSM Command to start a session
    new CfnOutput(this, 'ssmCommand', {
      value: `aws ssm start-session --target ${serverResources.instance.instanceId}`,
    });

    // SSH Command to connect to the EC2 Instance
    new CfnOutput(this, 'sshCommand', {
      value: `ssh ec2-user@${serverResources.instance.instancePublicDnsName}`,
    });
  }
}

const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'us-east-1',
};

const stackProps = {
  logLevel: process.env.LOG_LEVEL || 'INFO',
  sshPubKey: process.env.SSH_PUB_KEY || ' ',
  cpuType: process.env.CPU_TYPE || 'ARM64',
  instanceSize: process.env.INSTANCE_SIZE || 'LARGE',
};

const app = new App();

new EC2Example(app, 'EC2Example', {
  ...stackProps,
  env: devEnv,
});

app.synth();
