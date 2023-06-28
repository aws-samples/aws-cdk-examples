import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import {
  aws_iam as iam,
  aws_ec2 as ec2
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

// TODO: Change these to suitable values
const PARENT_REGION_AZ = 'eu-north-1a';
const LOCAL_ZONE_AZ = 'eu-north-1-hel-1a';

const VPC_CIDR = '172.31.100.0/24';
const SUBNET_SIZE = 26;

// Amazon Linux 2022 https://docs.aws.amazon.com/linux/al2022/ug/what-is-amazon-linux.html
const al2022Ami = ec2.MachineImage.fromSsmParameter('/aws/service/ami-amazon-linux-latest/al2022-ami-kernel-default-x86_64');

// Choose an instance type that is supported in the chosen Local Zone
// https://aws.amazon.com/about-aws/global-infrastructure/localzones/features/
const instanceType = ec2.InstanceType.of(ec2.InstanceClass.COMPUTE5, ec2.InstanceSize.XLARGE2);

const isolatedSubnetsInLocalZone: ec2.SubnetSelection = {
  subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
  availabilityZones: [LOCAL_ZONE_AZ],
};

const isolatedSubnetsInParentRegion: ec2.SubnetSelection = {
  subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
  availabilityZones: [PARENT_REGION_AZ],
};

const userDataNatInstance = ec2.UserData.forLinux();
userDataNatInstance.addCommands(
  'sudo sysctl -w net.ipv4.ip_forward=1',
  'sudo yum -y install iptables-services',
  'sudo iptables -t nat -A POSTROUTING -o ens5 -j MASQUERADE',
  'sudo iptables-save',
);

export class ExampleLocalZoneStack extends Stack {
  
  // The VPC is deployed to the parent region and in the Local Zone
  get availabilityZones() {
    return [
      PARENT_REGION_AZ,
      LOCAL_ZONE_AZ,
    ];
  }

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'Vpc', {
      ipAddresses: ec2.IpAddresses.cidr(VPC_CIDR),
      subnetConfiguration: [
        {
          cidrMask: SUBNET_SIZE,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: SUBNET_SIZE,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        }
      ]
    });

    // We need to add the VPC endpoints for SSM in the parent region
    vpc.addInterfaceEndpoint('ssm-messages', {
      privateDnsEnabled: true,
      service: ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES,
      subnets: vpc.selectSubnets(isolatedSubnetsInParentRegion),
    });

    vpc.addInterfaceEndpoint('ec2-messages', {
      privateDnsEnabled: true,
      service: ec2.InterfaceVpcEndpointAwsService.EC2_MESSAGES,
      subnets: vpc.selectSubnets(isolatedSubnetsInParentRegion),
    });

    vpc.addInterfaceEndpoint('ssm', {
      privateDnsEnabled: true,
      service: ec2.InterfaceVpcEndpointAwsService.SSM,
      subnets: vpc.selectSubnets(isolatedSubnetsInParentRegion),
    });

    // Instance role that allows SSM to connect
    const role = new iam.Role(this, 'InstanceRoleWithSsmPolicy', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
    });
    role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));

    // Start nginx with default settings (port 80)
    const userDataNginx = ec2.UserData.forLinux();
    userDataNginx.addCommands(
      'yum install -y nginx',
      'chkconfig nginx on',
      'service nginx start',
    );
    const nginxSecurityGroup = new ec2.SecurityGroup(this, 'WebServerSecurityGroup', {
      securityGroupName: `${id}WebServerSecurityGroup`,
      vpc,
      allowAllOutbound: true,
      description: 'Security group for the web server',
    });
    nginxSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));

    const instancePublic = new ec2.Instance(this, 'InstanceLzPublic', {
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
        availabilityZones: [LOCAL_ZONE_AZ],
      },
      instanceType,
      machineImage: al2022Ami,
      blockDevices: [{
          deviceName: '/dev/xvda',
          volume: ec2.BlockDeviceVolume.ebs(8, {
            encrypted: true,
            volumeType: ec2.EbsDeviceVolumeType.GP2,
          }),
      }],
      securityGroup: nginxSecurityGroup,
      userData: userDataNginx,
      userDataCausesReplacement: true,
      role,
    });

    const natSecurityGroup = new ec2.SecurityGroup(this, 'NatInstanceSecurityGroup', {
      securityGroupName: `${id}NatInstanceSecurityGroup`,
      vpc,
      allowAllOutbound: true,
      description: 'Security group for the NAT instance',
    });
    natSecurityGroup.addIngressRule(ec2.Peer.ipv4(VPC_CIDR), ec2.Port.allTcp());
    natSecurityGroup.addIngressRule(ec2.Peer.ipv4(VPC_CIDR), ec2.Port.allIcmp());
    const natInstance = new ec2.Instance(this, 'NatInstanceLocalZone', {
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
        availabilityZones: [LOCAL_ZONE_AZ],
      },
      sourceDestCheck: false,
      instanceType,
      machineImage: al2022Ami,
      blockDevices: [{
          deviceName: '/dev/xvda',
          volume: ec2.BlockDeviceVolume.ebs(8, {
            encrypted: true,
            volumeType: ec2.EbsDeviceVolumeType.GP2,
          }),
      }],
      securityGroup: natSecurityGroup,
      userData: userDataNatInstance,
      role,
      userDataCausesReplacement: true,
    });

    vpc.selectSubnets({
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      availabilityZones: [LOCAL_ZONE_AZ],
    }).subnets.forEach(s =>
      (s as ec2.PrivateSubnet).addRoute('Internet', {
        routerId: natInstance.instanceId,
        routerType: ec2.RouterType.INSTANCE,
        destinationCidrBlock: '0.0.0.0/0',
        enablesInternetConnectivity: true,
      }));

    const instance = new ec2.Instance(this, 'InstanceLz', {
      vpc,
      vpcSubnets: isolatedSubnetsInLocalZone,
      instanceType,
      machineImage: al2022Ami,
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: ec2.BlockDeviceVolume.ebs(8, {
            encrypted: true,
            volumeType: ec2.EbsDeviceVolumeType.GP2,
          }),
        }
      ],
      role,
      userDataCausesReplacement: true,
    });

    new CfnOutput(this, 'instancePublicIp', {
      exportName: 'instancePublicIp',
      value: instancePublic.instancePublicIp,
    });

    new CfnOutput(this, 'natInstancePublicIp', {
      exportName: 'natInstancePublicIp',
      value: natInstance.instancePublicIp,
    });

    new CfnOutput(this, 'instancePrivateIp', {
      exportName: 'instancePrivateIp',
      value: instance.instancePrivateIp,
    });
  }
}
