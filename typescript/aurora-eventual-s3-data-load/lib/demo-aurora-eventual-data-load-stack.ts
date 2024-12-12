import * as cdk from 'aws-cdk-lib';
import {Duration, RemovalPolicy} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {
  GatewayVpcEndpointAwsService,
  InstanceClass,
  InstanceSize,
  InstanceType,
  InterfaceVpcEndpointAwsService,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  Vpc
} from "aws-cdk-lib/aws-ec2";
import {Bucket, EventType} from "aws-cdk-lib/aws-s3";
import {Architecture, Code, Function, LayerVersion, LoggingFormat, Runtime} from "aws-cdk-lib/aws-lambda";
import {RetentionDays} from "aws-cdk-lib/aws-logs";
import {Queue} from "aws-cdk-lib/aws-sqs";
import {Alarm, ComparisonOperator, TreatMissingData} from "aws-cdk-lib/aws-cloudwatch";
import {SnsAction} from "aws-cdk-lib/aws-cloudwatch-actions";
import {Topic} from "aws-cdk-lib/aws-sns";
import {SqsDestination} from "aws-cdk-lib/aws-s3-notifications";
import {AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId} from "aws-cdk-lib/custom-resources";
import {
  AuroraMysqlEngineVersion,
  ClusterInstance,
  Credentials,
  DatabaseCluster,
  DatabaseClusterEngine,
  DBClusterStorageType
} from "aws-cdk-lib/aws-rds";

export class DemoAuroraEventualDataLoadStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the S3 Bucket to accommodate the data files using during the LOAD process.
    const dataBucket = new Bucket(this, 'DataBucket', {
      bucketName: `data-bucket-${this.account}`,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true
    })


    // Create the VPC where the workload will be allocated.
    const vpc = new Vpc(this, 'DemoVpc', {
      vpcName: 'demo-aurora-eventual-load-vpc',
      maxAzs: 2,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public-subnet',
          subnetType: SubnetType.PUBLIC
        },
        {
          cidrMask: 24,
          name: 'private-data-subnet',
          subnetType: SubnetType.PRIVATE_ISOLATED
        }
      ],
      gatewayEndpoints: {
        'S3Endpoint': {
          service: GatewayVpcEndpointAwsService.S3,
          subnets: [
            {subnetType: SubnetType.PRIVATE_ISOLATED}
          ]
        }
      },
    })
    vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
      service: InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      subnets: {
        subnetType: SubnetType.PRIVATE_ISOLATED
      }
    })


    // Create Security Groups that will be associated to the DB instance and lambda function.
    const lambdaSecurityGroup = new SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc: vpc,
      securityGroupName: 'demo-lambda-sg',
      allowAllOutbound: true,
    })

    const databaseSecurityGroup = new SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: vpc,
      securityGroupName: 'demo-database-sg',
      allowAllOutbound: true,
    })
    databaseSecurityGroup.addIngressRule(Peer.securityGroupId(lambdaSecurityGroup.securityGroupId), Port.tcp(3306))

    // If you need a bastion host to explore the DB instance, add this security group.
    const bastionSecurityGroup = new SecurityGroup(this, 'BastionSecurityGroup', {
      vpc: vpc,
      securityGroupName: 'demo-bastion-sg',
      allowAllOutbound: true,
    })
    bastionSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(22))
    databaseSecurityGroup.addIngressRule(Peer.securityGroupId(bastionSecurityGroup.securityGroupId), Port.tcp(3306))


    // Create the Aurora MySQL Database.
    const databaseCluster = new DatabaseCluster(this, 'DemoAuroraDatabase', {
      clusterIdentifier: 'demo-aurora-eventual-load',
      defaultDatabaseName: 'demo',
      engine: DatabaseClusterEngine.auroraMysql({version: AuroraMysqlEngineVersion.VER_3_07_1}),
      credentials: Credentials.fromGeneratedSecret('admin', {
        secretName: 'demo-aurora-eventual-load-database-secret'
      }),
      writer: ClusterInstance.provisioned('DemoAuroraDatabase', {
        instanceType: InstanceType.of(InstanceClass.BURSTABLE4_GRAVITON, InstanceSize.MEDIUM),
        instanceIdentifier: 'demo-aurora-eventual-load-writer'
      }),
      vpc: vpc,
      vpcSubnets: vpc.selectSubnets({subnetType: SubnetType.PRIVATE_ISOLATED}),
      securityGroups: [
        databaseSecurityGroup
      ],
      deletionProtection: false,
      removalPolicy: RemovalPolicy.DESTROY,
      s3ImportBuckets: [dataBucket],
      storageType: DBClusterStorageType.AURORA
    });


    // Create the SQS queue and DLQ to receive the S3 notifications.
    const dataLoadDlq = new Queue(this, 'DataLoadDlq', {
      queueName: 'demo-data-load-dlq',
      retentionPeriod: Duration.days(2),
      visibilityTimeout: Duration.seconds(15),
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const dataLoadQueue = new Queue(this, 'DataLoadQueue', {
      queueName: 'demo-data-load',
      retentionPeriod: Duration.days(2),
      visibilityTimeout: Duration.seconds(30),
      removalPolicy: RemovalPolicy.DESTROY,
      deadLetterQueue: {
        queue: dataLoadDlq,
        maxReceiveCount: 2
      }
    });
    dataBucket.addEventNotification(EventType.OBJECT_CREATED, new SqsDestination(dataLoadQueue), {
      suffix: 'csv'
    });


    // The bellow resource is meant to deploy a SQS PurgeQueue command to erase all the existing messages in the queue.
    // This is done to prevent the lambda function to consume the S3 TestEvent send when you create the S3 to SQS
    // notification. https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-how-to-event-types-and-destinations.html#supported-notification-event-types
    const purgeS3TestEvent = new AwsCustomResource(this, 'PurgeS3TestEvent', {
      onCreate: {
        service: 'SQS',
        action: 'purgeQueue',
        parameters: {
          QueueUrl: dataLoadQueue.queueUrl,
        },
        physicalResourceId: PhysicalResourceId.of('PurgeS3TestEvent')
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: AwsCustomResourcePolicy.ANY_RESOURCE,
      })
    });
    purgeS3TestEvent.node.addDependency(dataLoadQueue, dataBucket)


    // Create the lambda function to trigger the LOAD command in the database.
    // As this function requires PyMysql library, we create a lambda layer to accommodate it. In addition, we are also
    // associating the AWSLambdaPowertoolsPythonV2 layer to use out-of-the-box best practices solutions inside the function.
    const pymysqlLambdaLayer = new LayerVersion(this, 'PyMysqlLayer', {
      layerVersionName: 'pymysql-python-layer',
      code: Code.fromAsset('./lambda/layer/pymysql_lambda_layer.zip'),
      compatibleArchitectures: [
        Architecture.ARM_64
      ],
      compatibleRuntimes: [
        Runtime.PYTHON_3_12
      ]
    })

    const loadFunction = new Function(this, 'LoadDataFunction', {
      functionName: 'demo-aurora-eventual-data-load-function',
      code: Code.fromAsset('./lambda/function'),
      handler: "data-load-function.handler",
      runtime: Runtime.PYTHON_3_12,
      architecture: Architecture.ARM_64,
      environment: {
        'SECRETS_ID': databaseCluster.secret!.secretName,
        'DATABASE_URL': databaseCluster.clusterReadEndpoint.hostname,
        'DATABASE_PORT': databaseCluster.clusterReadEndpoint.port.toString()
      },
      events: [],
      layers: [
        pymysqlLambdaLayer,
        LayerVersion.fromLayerVersionArn(this, 'AWSLambdaPowertoolsPythonV2', 'arn:aws:lambda:us-east-1:017000801446:layer:AWSLambdaPowertoolsPythonV2-Arm64:78')
      ],
      logRetention: RetentionDays.ONE_DAY,
      loggingFormat: LoggingFormat.JSON,
      memorySize: 512,
      securityGroups: [
        lambdaSecurityGroup
      ],
      timeout: Duration.seconds(15),
      vpc: vpc,
      vpcSubnets: vpc.selectSubnets({subnetType: SubnetType.PRIVATE_ISOLATED})
    })
    databaseCluster.secret!.grantRead(loadFunction)
    dataLoadQueue.grantConsumeMessages(loadFunction);
    loadFunction.node.addDependency(purgeS3TestEvent)
    loadFunction.addEventSourceMapping('SqsNotification', {
      enabled: true,
      batchSize: 1,
      eventSourceArn: dataLoadQueue.queueArn,
    });


    // Create an SNS topic to notify the users whenever an error occurred during the LOAD process.
    const deadLetterNotification = new Topic(this, 'DeadLetterNotification', {
      topicName: 'demo-aurora-eventual-load-notification'
    });


    // Create a CloudWatch Alarm to monitor new messages in the DLQ, indicating errors during the LOAD process. The
    // alarm will send a notification through SNS whenever new messages appear in the DLQ.
    const deadLetterQueueAlarm = new Alarm(this, 'DeadLetterAlarm', {
      alarmName: 'demo-aurora-eventual-load-dlq-alarm',
      alarmDescription: 'Alarm triggered during the LOAD process',
      actionsEnabled: true,
      metric: dataLoadDlq.metricNumberOfMessagesReceived(),
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      threshold: 0,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: TreatMissingData.MISSING,
    });
    deadLetterQueueAlarm.addAlarmAction(new SnsAction(deadLetterNotification));


    // Outputs
    new cdk.CfnOutput(this, 'DataBucketName', {
      value: dataBucket.bucketName,
      description: 'Data Bucket Name'
    });

    new cdk.CfnOutput(this, 'DataLoadQueueName', {
      value: dataLoadQueue.queueName,
      description: 'Data Load Queue Name'
    });

    new cdk.CfnOutput(this, 'DLQName', {
      value: dataLoadDlq.queueName,
      description: 'Dead-letter Queue Name'
    });

    new cdk.CfnOutput(this, 'NotificationTopicName', {
      value: deadLetterNotification.topicName,
      description: 'Notification Topic Name'
    });

    new cdk.CfnOutput(this, 'FunctionLogGroupName', {
      value: loadFunction.logGroup.logGroupName,
      description: 'Function Log Group Name'
    });

    new cdk.CfnOutput(this, 'BastionHostSecurityGroupId', {
      value: bastionSecurityGroup.securityGroupId,
      description: 'Bastion Host Security Group ID'
    });

    new cdk.CfnOutput(this, 'VpcId', {
      value: vpc.vpcId,
      description: 'VPC ID'
    });

    new cdk.CfnOutput(this, 'DatabaseSecretName', {
      value: databaseCluster.secret!.secretName,
      description: 'Database Secret Name'
    });
  }
}
