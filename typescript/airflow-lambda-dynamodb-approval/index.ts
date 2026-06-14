import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as iam from "aws-cdk-lib/aws-iam";
import * as mwaa from "aws-cdk-lib/aws-mwaa";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class MwaaApprovalWorkflowStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC for MWAA (requires private subnets with NAT)
    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        { cidrMask: 24, name: "public", subnetType: ec2.SubnetType.PUBLIC },
        { cidrMask: 24, name: "private", subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      ],
    });

    // S3 bucket for DAGs (versioning required by MWAA)
    const dagsBucket = new s3.Bucket(this, "DagsBucket", {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // Upload DAGs to S3
    new s3deploy.BucketDeployment(this, "DeployDags", {
      sources: [s3deploy.Source.asset("./dags")],
      destinationBucket: dagsBucket,
      destinationKeyPrefix: "dags",
    });

    // DynamoDB table for approval workflow
    const approvalTable = new dynamodb.Table(this, "ApprovalTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Demo Lambda function invoked by Airflow
    const demoFunction = new lambda.Function(this, "DemoFunction", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "index.handler",
      code: lambda.Code.fromAsset("lambda"),
      timeout: cdk.Duration.seconds(30),
      memorySize: 128,
    });

    // MWAA execution role
    const mwaaRole = new iam.Role(this, "MwaaRole", {
      assumedBy: new iam.ServicePrincipal("airflow-env.amazonaws.com"),
    });

    // S3 access for DAGs bucket
    dagsBucket.grantRead(mwaaRole);

    // DynamoDB access scoped to approval table
    approvalTable.grantReadWriteData(mwaaRole);

    // Lambda invoke scoped to demo function
    demoFunction.grantInvoke(mwaaRole);

    // CloudWatch Logs for MWAA (scoped to airflow log groups)
    mwaaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "logs:CreateLogStream",
          "logs:CreateLogGroup",
          "logs:PutLogEvents",
          "logs:GetLogEvents",
          "logs:GetLogRecord",
          "logs:GetLogGroupFields",
          "logs:GetQueryResults",
        ],
        resources: [
          `arn:aws:logs:${this.region}:${this.account}:log-group:airflow-*`,
        ],
      })
    );

    // SQS for Airflow Celery executor (MWAA-managed queues)
    mwaaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "sqs:ChangeMessageVisibility",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl",
          "sqs:ReceiveMessage",
          "sqs:SendMessage",
        ],
        resources: [
          `arn:aws:sqs:${this.region}:${this.account}:airflow-celery-*`,
        ],
      })
    );

    // KMS for MWAA encryption (conditioned to SQS/S3 usage)
    mwaaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["kms:Decrypt", "kms:DescribeKey", "kms:GenerateDataKey*", "kms:Encrypt"],
        resources: ["*"],
        conditions: {
          StringEquals: {
            "kms:ViaService": [
              `sqs.${this.region}.amazonaws.com`,
              `s3.${this.region}.amazonaws.com`,
            ],
          },
        },
      })
    );

    // CloudWatch Metrics (required by MWAA, no resource-level scoping available)
    mwaaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["cloudwatch:PutMetricData"],
        resources: ["*"],
        conditions: {
          StringEquals: { "cloudwatch:namespace": "AWS/MWAA" },
        },
      })
    );

    // Security group for MWAA
    const sg = new ec2.SecurityGroup(this, "MwaaSg", {
      vpc,
      description: "MWAA environment security group",
      allowAllOutbound: true,
    });
    sg.addIngressRule(sg, ec2.Port.allTraffic(), "Self-referencing rule for MWAA");

    // MWAA environment
    const mwaaEnv = new mwaa.CfnEnvironment(this, "MwaaEnv", {
      name: `mwaa-approval-${this.region}`,
      dagS3Path: "dags",
      executionRoleArn: mwaaRole.roleArn,
      sourceBucketArn: dagsBucket.bucketArn,
      networkConfiguration: {
        subnetIds: vpc.privateSubnets.map((s) => s.subnetId),
        securityGroupIds: [sg.securityGroupId],
      },
      environmentClass: "mw1.small",
      maxWorkers: 2,
      minWorkers: 1,
      airflowVersion: "2.9.2",
      webserverAccessMode: "PUBLIC_ONLY",
      airflowConfigurationOptions: {
        "core.default_timezone": "UTC",
      },
      loggingConfiguration: {
        dagProcessingLogs: { enabled: true, logLevel: "INFO" },
        schedulerLogs: { enabled: true, logLevel: "INFO" },
        taskLogs: { enabled: true, logLevel: "INFO" },
        webserverLogs: { enabled: true, logLevel: "INFO" },
        workerLogs: { enabled: true, logLevel: "INFO" },
      },
    });

    // Outputs
    new cdk.CfnOutput(this, "MwaaWebServerUrl", {
      value: `https://${mwaaEnv.attrWebserverUrl}`,
    });
    new cdk.CfnOutput(this, "ApprovalTableName", {
      value: approvalTable.tableName,
    });
    new cdk.CfnOutput(this, "DemoFunctionName", {
      value: demoFunction.functionName,
    });
    new cdk.CfnOutput(this, "DagsBucketName", {
      value: dagsBucket.bucketName,
    });
  }
}

const app = new cdk.App();
new MwaaApprovalWorkflowStack(app, "MwaaApprovalWorkflowStack");
