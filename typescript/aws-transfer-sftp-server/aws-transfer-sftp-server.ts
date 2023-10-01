import { Stack, StackProps, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
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
  /** User name for the default SFTP user.
   * @example 'sftp-user'
   */
  userName: string;

  /** The public key of the SFTP user. */
  userPublicKeys: string[];

  /** IP addresses that are allowed to connect to the SFTP server.
   * @default All IPV4 is allowed.
   */
  allowedIps?: string[];

  /** The S3 bucket to be configured for the SFTP server. */
  dataBucket: s3.IBucket;
}

/** Stack for initializing a fully working SFTP server. */
export class SftpServerStack extends Stack {

  /** CloudWatch alarm that is triggered if there are too many errors in the logs. */
  errorAlarm: cw.Alarm;

  constructor(scope: Construct, id: string, props: SftpServerStackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'VPC', {
      maxAzs: 2,
      natGateways: 0,
    });

    // Create the required IAM role which allows the SFTP server
    // to log to CloudWatch.
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

    // Security group for restricting incoming traffic to specific IP addresses
    const sg = new ec2.SecurityGroup(this, 'SftpServerSG', {
      vpc,
      allowAllOutbound: false,
      securityGroupName: 'SFTPServerSG',
      description: 'Security group for SFTP server',
    });

    // In production it's good to allow only specific IP addresses
    if (props.allowedIps) {
      props.allowedIps.forEach((ip) => {
        sg.addIngressRule(ec2.Peer.ipv4(ip), ec2.Port.tcp(22), 'Allow SSH inbound');
      });
    } else {
      sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH inbound');
    }

    // Create as many Elastic IP addresses as we have availability zones
    const eips = vpc.publicSubnets.map((_, index) => new ec2.CfnEIP(this, `SftpEIP${index + 1}`, {
      domain: 'vpc',
    }));

    const server = new transfer.CfnServer(this, 'SFTPServer', {
      endpointDetails: {
        securityGroupIds: [sg.securityGroupId],
        vpcId: vpc.vpcId,
        subnetIds: vpc.publicSubnets.map((subnet) => subnet.subnetId),
        addressAllocationIds: eips.map((eip) => eip.attrAllocationId),
      },
      identityProviderType: 'SERVICE_MANAGED',
      endpointType: 'VPC',
      loggingRole: cloudWatchLoggingRole.roleArn,
      protocols: ['SFTP'],
      domain: 'S3',
    });

    // Output Server Endpoint access where clients can connect
    new CfnOutput(this, 'SFTPServerEndpoint', {
      description: 'Server Endpoint',
      value: `${server.attrServerId}.server.transfer.${this.region}.amazonaws.com`,
    });

    // Allow SFTP user to write the S3 bucket
    const sftpAccessPolicy = new iam.ManagedPolicy(this, 'SftpAccessPolicy', {
      managedPolicyName: 'SftpAccessPolicy',
      description: 'SFTP access policy',
    });
    props.dataBucket.grantReadWrite(sftpAccessPolicy);

    const sftpUserAccessRole = new iam.Role(this, 'SftpAccessRole', {
      assumedBy: new iam.ServicePrincipal('transfer.amazonaws.com'),
      roleName: 'SftpAccessRole',
      managedPolicies: [
        sftpAccessPolicy,
      ],
    });

    const logGroup = new logs.LogGroup(this, 'SftpLogGroup', {
      logGroupName: `/aws/transfer/${server.attrServerId}`,
      removalPolicy: RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_MONTH,
    });

    // Configure user which has access to the S3 bucket
    // https://docs.aws.amazon.com/transfer/latest/userguide/service-managed-users.html
    new transfer.CfnUser(this, 'SFTPUser', {
      serverId: server.attrServerId,
      homeDirectory: `/${props.dataBucket.bucketName}/incoming-data`,
      role: sftpUserAccessRole.roleArn,
      userName: props.userName,
      sshPublicKeys: props.userPublicKeys,
    });

    // Metric filter for recognizing two types of errors in the SFTP logs
    const metricFilter = new logs.MetricFilter(this, 'MetricFilter', {
      logGroup,
      metricNamespace: 'SftpServer',
      metricName: 'ErrorLog',
      filterPattern: logs.FilterPattern.anyTerm('ERRORS AUTH_FAILURE', 'ERROR Message'),
      metricValue: '1',
      unit: cw.Unit.COUNT,
    });

    // Alarm if there are too many errors
    this.errorAlarm = new cw.Alarm(this, 'AlarmMetricFilter', {
      alarmDescription: 'Alarm if there are too many errors in the logs',
      metric: metricFilter.metric(),
      threshold: 1,
      evaluationPeriods: 5,
      datapointsToAlarm: 1,
    });

    // TODO Add alarm action to notify administrators or perform other actions
  }
}
