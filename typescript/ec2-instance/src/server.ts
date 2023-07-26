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

    const assetBucket = new Bucket(this, 'assetBucket', {
      publicReadAccess: false,
      removalPolicy: RemovalPolicy.DESTROY,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_PREFERRED,
      autoDeleteObjects: true,
    });

    new BucketDeployment(this, 'assetBucketDeployment', {
      sources: [Source.asset('src/resources/server/assets')],
      destinationBucket: assetBucket,
      retainOnDelete: false,
      exclude: ['**/node_modules/**', '**/dist/**'],
      memoryLimit: 512,
    });

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

    assetBucket.grantReadWrite(serverRole);

    const userData = UserData.forLinux();
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

    const ec2InstanceSecurityGroup = new SecurityGroup(
      this,
      'ec2InstanceSecurityGroup',
      { vpc: props.vpc, allowAllOutbound: true },
    );

    if (props.cpuType == 'ARM64') {
      cpuType = AmazonLinuxCpuType.ARM_64;
      instanceClass = InstanceClass.M7G;
    } else {
      cpuType = AmazonLinuxCpuType.X86_64;
      instanceClass = InstanceClass.M5;
    }

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
              STACK_ID: Stack.of(this).artifactId,
            }),
            InitFile.fromFileInline(
              '/tmp/amazon-cloudwatch-agent.json',
              './src/resources/server/config/amazon-cloudwatch-agent.json',
            ),
            InitFile.fromFileInline(
              '/etc/config.sh',
              'src/resources/server/config/config.sh',
            ),
            InitFile.fromString(
              '/home/ec2-user/.ssh/authorized_keys',
              props.sshPubKey + '\n',
            ),
            InitCommand.shellCommand('chmod +x /etc/config.sh'),
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

    this.instance.addSecurityGroup(props.sshSecurityGroup);
  }
}
