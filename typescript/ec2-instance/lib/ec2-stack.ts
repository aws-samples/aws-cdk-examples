import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { VPCResources } from './constructs/vpc';
import { ServerResources } from './constructs/server';
import { EC2ExampleProps, envValidator } from './utils/env-validator';

export interface EC2StackProps extends StackProps, EC2ExampleProps {}

export class EC2Stack extends Stack {
  constructor(scope: Construct, id: string, props: EC2StackProps) {
    super(scope, id, props);

    const { logLevel, cpuType, instanceSize } = props;

    // Validate environment variables
    envValidator(props);

    // Create VPC
    const vpcResources = new VPCResources(this, 'VPC');

    // Create EC2 Instance
    const serverResources = new ServerResources(this, 'EC2', {
      vpc: vpcResources.vpc,
      logLevel: logLevel,
      cpuType: cpuType,
      instanceSize: instanceSize.toLowerCase(),
    });

    // SSM command to start a session on the instance. Session Manager is the
    // access path: it needs no open inbound ports and no SSH key.
    new CfnOutput(this, 'ssmCommand', {
      value: `aws ssm start-session --target ${serverResources.instance.instanceId}`,
    });
  }
}
