import {
  SecurityGroup,
  Peer,
  Port,
  SubnetType,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class VPCResources extends Construct {
  public sshSecurityGroup: SecurityGroup;
  public vpc: Vpc;

  constructor(scope: Construct, id: string) {
    super(scope, id);

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

    this.sshSecurityGroup = new SecurityGroup(this, 'SSHSecurityGroup', {
      vpc: this.vpc,
      description: 'Security Group for SSH',
      allowAllOutbound: true,
    });

    this.sshSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(22));
  }
}
