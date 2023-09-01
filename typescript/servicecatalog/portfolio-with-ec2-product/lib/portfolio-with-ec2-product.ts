import { Construct } from 'constructs';
import { Stack, StackProps, Fn, CfnOutput, CfnParameter } from 'aws-cdk-lib';
import { aws_iam as iam, aws_ec2 as ec2, aws_sns as sns, aws_servicecatalog as sc } from 'aws-cdk-lib';

class Ec2CdkProductStack extends sc.ProductStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const vpc = new ec2.Vpc(this, 'VPC', {
      natGateways: 0,
      subnetConfiguration: [{
        cidrMask: 24,
        name: 'public',
        subnetType: ec2.SubnetType.PUBLIC,
      }]
    });

    const role = new iam.Role(this, 'ec2Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    });

    role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'))

    // Use Latest Amazon Linux Image - CPU Type ARM64
    const ami = new ec2.AmazonLinuxImage({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      cpuType: ec2.AmazonLinuxCpuType.ARM_64,
    });

    // EC2 Instance Type parameter
    const ec2InstanceType = new CfnParameter(this, 'InstanceType', {
      type: 'String',
      description: 'The instance type of an EC2 instance.',
    });

    // Create the instance using the Security Group, AMI, and KeyPair defined in the VPC created
    const ec2Instance = new ec2.Instance(this, 'Instance', {
      vpc,
      instanceType: new ec2.InstanceType(ec2InstanceType.valueAsString),
      machineImage: ami,
      allowAllOutbound: true,
      role: role,
    });
    ec2Instance.connections.allowFromAnyIpv4(ec2.Port.tcp(22), 'Allow SSH (TCP port 22) in');

    new CfnOutput(this, 'IP Address', { value: ec2Instance.instancePublicIp });
    new CfnOutput(this, 'Download Key Command', { value: 'aws secretsmanager get-secret-value --secret-id ec2-ssh-key/cdk-keypair/private --query SecretString --output text > cdk-key.pem && chmod 400 cdk-key.pem' });
    new CfnOutput(this, 'ssh command', { value: 'ssh -i cdk-key.pem -o IdentitiesOnly=yes ec2-user@' + ec2Instance.instancePublicIp });
  }
}

export class Ec2CdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create a portfolio
    const portfolio = new sc.Portfolio(this, 'DevToolsPortfolio', {
      displayName: 'DevTools',
      providerName: 'IT',
    });

    // Create a an EC2 product from a Product Stack
    const product = new sc.CloudFormationProduct(this, 'VpcEC2SampleStack', {
      productName: 'Ec2CdkStack',
      owner: 'IT',
      productVersions: [
        {
          cloudFormationTemplate: sc.CloudFormationTemplate.fromProductStack(new Ec2CdkProductStack(this, 'VpcEc2Product')),
          productVersionName: 'FromProductStack',
          description: 'A VPC containing an EC2 Instance',
        },
        {
          cloudFormationTemplate: sc.CloudFormationTemplate.fromAsset('assets/ec2_vpc.json'),
          productVersionName: 'FromAsset',
          description: 'A VPC containing an EC2 Instance',
        },
      ],
    });

    // Add a launch template constraint
    portfolio.constrainCloudFormationParameters(product, {
      rule: {
        ruleName: 'EC2InstanceTypes',
        assertions: [
          {
            assert: Fn.conditionContains(['t4g.micro', 't4g.small'], Fn.ref('InstanceType')),
            description: 'For test environment, valid instance types are t4g.micro or t4g.small',
          },
        ],
      }
    });

    // Associate product to the portfolio
    portfolio.addProduct(product);

    // Create SNS topics to listen to product events
    const stackEventsTopic = new sns.Topic(this, 'StackEventsTopic');
    // Add launch notification constraint
    portfolio.notifyOnStackEvents(product, stackEventsTopic);

    // Grant access to an end user
    const devRole = new iam.Role(this, 'SCRole', {
      assumedBy: new iam.AccountRootPrincipal(),
      roleName: 'Developer',
    });
    portfolio.giveAccessToRole(devRole);

    // Grant access to an IAM group
    const testGroup = new iam.Group(this, 'TestGroup', {
      groupName: 'Testers',
    });
    portfolio.giveAccessToGroup(testGroup);
  }
}
