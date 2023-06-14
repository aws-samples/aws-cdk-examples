import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import {
  aws_s3 as s3,
  aws_ec2 as ec2,
  aws_iam as iam,
  aws_logs as logs,
  aws_cloudwatch as cw,
  aws_transfer as transfer,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

/** Properties required to setup the SFTP server. */
export interface SftpServerStackProps extends StackProps {
  /** User name for the default user.
   * @example 'sftp-user'
   */
  userName: string;
  /** The public key of the user */
  userPublicKeys: string[];
  /** Allowed IPs. 
   * @default All IPV4 is allowed.
   */
  allowedIps?: string[];
}

/** Stack for initializing a fully working SFTP server. */
export class SftpServerStack extends Stack {

  /** S3 bucket for storing the incoming data. */
  incomingDataBucket: s3.Bucket;

  /** CloudWatch alarm that is triggered if there are too many errors in the logs. */
  errorAlarm: cw.Alarm;

  constructor(scope: Construct, id: string, props: SftpServerStackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'VPC', {
      maxAzs: 2,
      natGateways: 0,
    });

    this.incomingDataBucket = new s3.Bucket(this, 'IncomingDataBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      bucketName: `sftp-server-data-bucket-${this.account}-${this.region}`,
      encryption: s3.BucketEncryption.KMS_MANAGED,
      enforceSSL: true,
      // Do not use for production
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Allow SFTP server to log to CloudWatch
    const cloudWatchLoggingRole = new iam.Role(this, 'CloudWatchLoggingRole', {
      assumedBy: new iam.ServicePrincipal('transfer.amazonaws.com'),
      description: 'IAM role used by AWS Transfer for logging',
      inlinePolicies: {
        loggingRole: new iam.PolicyDocument({
          statements: [new iam.PolicyStatement({
            actions: [
              'logs:CreateLogGroup',
              'logs:CreateLogStream',
              'logs:DescribeLogStreams',
              'logs:PutLogEvents',
            ],
            resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/transfer/*`],
            effect: iam.Effect.ALLOW,
          })],
        }),
      },
    });

    const sg = new ec2.SecurityGroup(this, 'SftpServerSG', {
      vpc,
      allowAllOutbound: false,
      securityGroupName: 'SFTPServerSG',
      description: 'Security group for SFTP server',
    });

    // In production always specify allowed IPs
    if (props.allowedIps) {
      props.allowedIps.forEach((ip) => {
        sg.addIngressRule(ec2.Peer.ipv4(ip), ec2.Port.tcp(22), 'Allow SSH inbound');
      });
    } else {
      sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH inbound');
    }

    const eip1 = new ec2.CfnEIP(this, 'SftpEIP1', {
      domain: 'vpc',
    });
    const eip2 = new ec2.CfnEIP(this, 'SftpEIP2', {
      domain: 'vpc',
    });

    const server = new transfer.CfnServer(this, 'SFTPServer', {
      endpointDetails: {
        securityGroupIds: [sg.securityGroupId],
        vpcId: vpc.vpcId,
        subnetIds: vpc.publicSubnets.map((subnet) => subnet.subnetId),
        addressAllocationIds: [eip1.attrAllocationId, eip2.attrAllocationId],
      },
      identityProviderType: 'SERVICE_MANAGED',
      endpointType: 'VPC',
      loggingRole: cloudWatchLoggingRole.roleArn,
      protocols: ['SFTP'],
      domain: 'S3',
    });

    // Allow SFTP user to write the S3 bucket
    const sftpAccessPolicy = new iam.ManagedPolicy(this, 'SftpAccessPolicy', {
      managedPolicyName: 'SftpAccessPolicy',
      description: 'SFTP access policy',
    });
    this.incomingDataBucket.grantReadWrite(sftpAccessPolicy);

    const sftpUserAccessRole = new iam.Role(this, 'SftpAccessRole', {
      assumedBy: new iam.ServicePrincipal('transfer.amazonaws.com'),
      roleName: 'SftpAccessRole',
      managedPolicies: [
        sftpAccessPolicy,
      ],
    });

    new transfer.CfnUser(this, 'SFTPUser', {
      serverId: server.attrServerId,
      homeDirectory: `/${this.incomingDataBucket.bucketName}/incoming-data`,
      role: sftpUserAccessRole.roleArn,
      userName: props.userName,
      sshPublicKeys: props.userPublicKeys,
    });

    const metricFilter = new logs.MetricFilter(this, 'MetricFilter', {
      logGroup: logs.LogGroup.fromLogGroupName(this, 'LogGroup', `/aws/transfer/${server.attrServerId}`),
      metricNamespace: 'SftpServer',
      metricName: 'ErrorLog',
      filterPattern: logs.FilterPattern.anyTerm('ERRORS AUTH_FAILURE', 'ERROR Message'),
      metricValue: '1',
      unit: cw.Unit.COUNT,
    });
    const metric = metricFilter.metric();

    this.errorAlarm = new cw.Alarm(this, 'AlarmMetricFilter', {
      alarmDescription: 'Alarm if there are too many errors in the logs',
      metric,
      threshold: 1,
      evaluationPeriods: 5,
      datapointsToAlarm: 1,
    });

    // TODO Add alarm action if required
  }
}
