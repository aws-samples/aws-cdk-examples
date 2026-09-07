import { SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class VPCResources extends Construct {
  public vpc: Vpc;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Create a VPC with public subnets in 2 AZs. The instance reaches the
    // Systems Manager endpoints over its public IP, so no NAT gateway is needed
    // and no inbound ports are opened.
    this.vpc = new Vpc(this, 'VPC', {
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'ServerPublic',
          subnetType: SubnetType.PUBLIC,
          mapPublicIpOnLaunch: true,
        },
      ],
      maxAzs: 2,
    });
  }
}
