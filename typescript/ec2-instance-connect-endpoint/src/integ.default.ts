import {
  App, CfnOutput, Stack,
  aws_ec2 as ec2,
} from 'aws-cdk-lib';
import { InstanceConnectEndpoint } from './endpoint';
import { Construct } from 'constructs'

export class IntegTesting {
  readonly stack: Stack[];
  constructor() {
    const app = new App();
    const env = { region: process.env.CDK_DEFAULT_REGION, account: process.env.CDK_DEFAULT_ACCOUNT };
    const stack = new Stack(app, 'integ-testing-eicendpoint', { env });

    const vpc = new ec2.Vpc(stack, 'Vpc', { subnetConfiguration: [{ cidrMask: 24, name: 'rds', subnetType: ec2. SubnetType. PRIVATE_ISOLATED }] });

    const instance = new ec2.Instance(stack, 'instance', {
      vpc,
      vpcSubnets: vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_ISOLATED }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.LARGE),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
    });

    new CfnOutput(stack, 'InstanceId', { value: instance.instanceId });

    // allow all traffic from within VPC
    instance.connections.allowFrom(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.allTraffic());
    /**
     * As `InstanceConnectEndpoint` requires docker image assets bundling and
     * `aws-cdk-examples` has an issue with that. To workaround it, if we are in a fake context
     * we just skip it. Temporary workaround until this issue is resolved.
     * https://github.com/aws-samples/aws-cdk-examples/blob/master/scripts/fake.context.json
     */
    if (!isFakeContext(stack)) {
      new InstanceConnectEndpoint(stack, 'EICEndpoint', {
        subnet: vpc.isolatedSubnets[0],
        preserveClientIp: false,
      });
    }
    this.stack = [stack];
  }
};

function isFakeContext(scope: Construct) {
  return Stack.of(scope).node.tryGetContext('x') === 'y';
}

new IntegTesting();
