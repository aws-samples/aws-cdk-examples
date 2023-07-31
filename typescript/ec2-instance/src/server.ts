/* eslint-disable import/no-extraneous-dependencies */
import { RemovalPolicy, Duration, Stack } from 'aws-cdk-lib';
import {
  Vpc,
  SecurityGroup,
  Instance,
  InstanceType,
  InstanceClass,
  InstanceSize,
  CloudFormationInit,
  InitConfig,
  InitFile,
  InitCommand,
  UserData,
  MachineImage,
  AmazonLinuxCpuType,
} from 'aws-cdk-lib/aws-ec2';
import {
  Role,
  ServicePrincipal,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement,
} from 'aws-cdk-lib/aws-iam';
import { Bucket, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import { Source, BucketDeployment } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

interface ServerProps {
  vpc: Vpc;
  sshSecurityGroup: SecurityGroup;
  logLevel: string;
  sshPubKey: string;
  cpuType: string;
  instanceSize: string;
}

let cpuType: AmazonLinuxCpuType;
let instanceClass: InstanceClass;
let instanceSize: InstanceSize;

export class ServerResources extends Construct {
  public instance: Instance;

  constructor(scope: Construct, id: string, props: ServerProps) {
    super(scope, id);

    // Create an Asset Bucket for the Instance.  Assets in this bucket will be downloaded to the EC2 during deployment
    const assetBucket = new Bucket(this, 'assetBucket', {
      publicReadAccess: false,
      removalPolicy: RemovalPolicy.DESTROY,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_PREFERRED,
      autoDeleteObjects: true,
    });

    // Deploy the local assets to the Asset Bucket during the CDK deployment
    new BucketDeployment(this, 'assetBucketDeployment', {
      sources: [Source.asset('src/resources/server/assets')],
      destinationBucket: assetBucket,
      retainOnDelete: false,
      exclude: ['**/node_modules/**', '**/dist/**'],
      memoryLimit: 512,
    });

    // Create a role for the EC2 instance to assume.  This role will allow the instance to put log events to CloudWatch Logs
    const serverRole = new Role(this, 'serverEc2Role', {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      inlinePolicies: {
        ['RetentionPolicy']: new PolicyDocument({
          statements: [
            new PolicyStatement({
              resources: ['*'],
              actions: ['logs:PutRetentionPolicy'],
            }),
          ],
        }),
      },
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
      ],
    });

    // Grant the EC2 role access to the bucket
    assetBucket.grantReadWrite(serverRole);

    const userData = UserData.forLinux();

    // Add user data that is used to configure the EC2 instance
    userData.addCommands(
      'yum update -y',
      'curl -sL https://dl.yarnpkg.com/rpm/yarn.repo | sudo tee /etc/yum.repos.d/yarn.repo',
      'curl -sL https://rpm.nodesource.com/setup_18.x | sudo -E bash - ',
      'yum install -y amazon-cloudwatch-agent nodejs python3-pip zip unzip docker yarn',
      'sudo systemctl enable docker',
      'sudo systemctl start docker',
      'mkdir -p /home/ec2-user/sample',
      'aws s3 cp s3://' +
        assetBucket.bucketName +
        '/sample /home/ec2-user/sample --recursive',
    );

    // Create a Security Group for the EC2 instance.  This group will allow SSH access to the EC2 instance
    const ec2InstanceSecurityGroup = new SecurityGroup(
      this,
      'ec2InstanceSecurityGroup',
      { vpc: props.vpc, allowAllOutbound: true },
    );

    // Determine the correct CPUType and Instance Class based on the props passed in
    if (props.cpuType == 'ARM64') {
      cpuType = AmazonLinuxCpuType.ARM_64;
      instanceClass = InstanceClass.M7G;
    } else {
      cpuType = AmazonLinuxCpuType.X86_64;
      instanceClass = InstanceClass.M5;
    }

    // Determine the correct InstanceSize based on the props passed in
    switch (props.instanceSize) {
      case 'large':
        instanceSize = InstanceSize.LARGE;
        break;
      case 'xlarge':
        instanceSize = InstanceSize.XLARGE;
        break;
      case 'xlarge2':
        instanceSize = InstanceSize.XLARGE2;
        break;
      case 'xlarge4':
        instanceSize = InstanceSize.XLARGE4;
        break;
      default:
        instanceSize = InstanceSize.LARGE;
    }

    // Create the EC2 instance
    this.instance = new Instance(this, 'Instance', {
      vpc: props.vpc,
      instanceType: InstanceType.of(instanceClass, instanceSize),
      machineImage: MachineImage.latestAmazonLinux2023({
        cachedInContext: false,
        cpuType: cpuType,
      }),
      userData: userData,
      securityGroup: ec2InstanceSecurityGroup,
      init: CloudFormationInit.fromConfigSets({
        configSets: {
          default: ['config'],
        },
        configs: {
          config: new InitConfig([
            InitFile.fromObject('/etc/config.json', {
              // Use CloudformationInit to create an object on the EC2 instance
              STACK_ID: Stack.of(this).artifactId,
            }),
            InitFile.fromFileInline(
              // Use CloudformationInit to copy a file to the EC2 instance
              '/tmp/amazon-cloudwatch-agent.json',
              './src/resources/server/config/amazon-cloudwatch-agent.json',
            ),
            InitFile.fromFileInline(
              '/etc/config.sh',
              'src/resources/server/config/config.sh',
            ),
            InitFile.fromString(
              // Use CloudformationInit to write a string to the EC2 instance
              '/home/ec2-user/.ssh/authorized_keys',
              props.sshPubKey + '\n',
            ),
            InitCommand.shellCommand('chmod +x /etc/config.sh'), // Use CloudformationInit to run a shell command on the EC2 instance
            InitCommand.shellCommand('/etc/config.sh'),
          ]),
        },
      }),

      initOptions: {
        timeout: Duration.minutes(10),
        includeUrl: true,
        includeRole: true,
        printLog: true,
      },
      role: serverRole,
    });

    // Add the SSH Security Group to the EC2 instance
    this.instance.addSecurityGroup(props.sshSecurityGroup);
  }
}
