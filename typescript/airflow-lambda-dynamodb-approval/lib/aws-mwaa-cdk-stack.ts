import { Stack, StackProps, RemovalPolicy, CfnOutput, Duration } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as mwaa from 'aws-cdk-lib/aws-mwaa';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class AwsMwaaCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // 1. Create VPC for MWAA (required)
    const vpc = new ec2.Vpc(this, 'MwaaVpc', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        }
      ]
    });

    // 2. Create S3 bucket for MWAA DAGs
    const dagsBucket = new s3.Bucket(this, 'MwaaDagsBucket', {
      bucketName: `mwaa-dags-${this.account}-${this.region}`,
      versioned: true,
      removalPolicy: RemovalPolicy.DESTROY, // For demo purposes
      autoDeleteObjects: true, // For demo purposes
    });

    // 3. Upload local dags folder to the S3 bucket
    new s3deploy.BucketDeployment(this, 'DeployDags', {
      sources: [s3deploy.Source.asset('./dags')],
      destinationBucket: dagsBucket,
      destinationKeyPrefix: 'dags',
    });

    // 4. Create Demo Lambda Function for MWAA testing (original simple demo)
    const demoLambdaFunction = new lambda.Function(this, 'MwaaTestLambda', {
      functionName: 'mwaa-demo-function',
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'index.lambda_handler',
      code: lambda.Code.fromInline(`
import json
import datetime

def lambda_handler(event, context):
    """
    Demo Lambda function for MWAA integration testing
    Processes data sent from Airflow and returns a response
    """
    
    # Log the incoming event
    print(f"Received event: {json.dumps(event)}")
    
    # Extract Airflow context if present
    airflow_context = {
        'dag_id': event.get('dag_id', 'unknown'),
        'task_id': event.get('task_id', 'unknown'),
        'timestamp': event.get('timestamp', 'unknown'),
        'message': event.get('message', 'Hello from Lambda!')
    }
    
    # Process the data (simple example)
    processed_data = {
        'status': 'success',
        'processed_at': datetime.datetime.now().isoformat(),
        'original_message': airflow_context['message'],
        'airflow_context': airflow_context,
        'lambda_function_name': context.function_name,
        'lambda_request_id': context.aws_request_id,
        'processed_by': 'mwaa-demo-lambda'
    }
    
    # Return response
    response = {
        'statusCode': 200,
        'body': json.dumps(processed_data)
    }
    
    print(f"Returning response: {json.dumps(response)}")
    return response
      `),
      timeout: Duration.seconds(30),
      memorySize: 128,
      description: 'Demo Lambda function for MWAA Airflow integration testing'
    });

    // 4. Create DynamoDB Approval Table for Human Approval Workflows
    const approvalTable = new dynamodb.Table(this, 'ApprovalTable', {
      tableName: `mwaa-approval-table-${this.region}`,
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY, // For demo purposes
      pointInTimeRecovery: false, // For demo purposes
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Add GSI for querying by status and timestamp
    approvalTable.addGlobalSecondaryIndex({
      indexName: 'approval_status-index',
      partitionKey: {
        name: 'approval_status',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'created_at',
        type: dynamodb.AttributeType.STRING
      }
    });

    // 5. Create MWAA Execution Role
    const mwaaExecutionRole = new iam.Role(this, 'MwaaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('airflow-env.amazonaws.com'),
      inlinePolicies: {
        MwaaExecutionRolePolicy: new iam.PolicyDocument({
          statements: [
            // S3 permissions for DAG bucket
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject*',
                's3:GetBucket*',
                's3:List*'
              ],
              resources: [
                dagsBucket.bucketArn,
                `${dagsBucket.bucketArn}/*`
              ]
            }),
            // CloudWatch Logs permissions - Comprehensive MWAA logging access
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'logs:CreateLogStream',
                'logs:CreateLogGroup',
                'logs:PutLogEvents',
                'logs:GetLogEvents',
                'logs:GetLogRecord',
                'logs:GetLogGroupFields',
                'logs:GetQueryResults',
                'logs:DescribeLogGroups',
                'logs:DescribeLogStreams',
                'logs:DescribeDestinations',
                'logs:DescribeExportTasks',
                'logs:DescribeMetricFilters',
                'logs:DescribeQueries',
                'logs:DescribeResourcePolicies',
                'logs:DescribeSubscriptionFilters',
                'logs:FilterLogEvents',
                'logs:StartQuery',
                'logs:StopQuery'
              ],
              resources: [
                `arn:aws:logs:${this.region}:${this.account}:log-group:airflow-*`,
                `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/mwaa/*`,
                `arn:aws:logs:${this.region}:${this.account}:log-group:*airflow*`,
                `arn:aws:logs:${this.region}:${this.account}:*`
              ]
            }),
            // CloudWatch Metrics permissions - Comprehensive access
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'cloudwatch:PutMetricData',
                'cloudwatch:GetMetricStatistics',
                'cloudwatch:GetMetricData',
                'cloudwatch:ListMetrics',
                'cloudwatch:DescribeAlarms',
                'cloudwatch:DescribeAlarmsForMetric',
                'cloudwatch:GetDashboard',
                'cloudwatch:ListDashboards'
              ],
              resources: ['*']
            }),
            // SQS permissions for Airflow
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'sqs:ChangeMessageVisibility',
                'sqs:DeleteMessage',
                'sqs:GetQueueAttributes',
                'sqs:GetQueueUrl',
                'sqs:ReceiveMessage',
                'sqs:SendMessage'
              ],
              resources: [
                `arn:aws:sqs:${this.region}:*:airflow-celery-*`
              ]
            }),
            // KMS permissions for encryption
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'kms:Decrypt',
                'kms:DescribeKey',
                'kms:GenerateDataKey*',
                'kms:Encrypt'
              ],
              resources: ['*'],
              conditions: {
                StringEquals: {
                  'kms:ViaService': [
                    `sqs.${this.region}.amazonaws.com`,
                    `s3.${this.region}.amazonaws.com`
                  ]
                }
              }
            })
          ]
        }),
        LambdaExecutionPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'lambda:InvokeFunction',
                'lambda:GetFunction',
                'lambda:ListFunctions'
              ],
              resources: ['*'], // Allows access to all Lambda functions in the account
              sid: 'LambdaInvokePermissions'
            })
          ]
        }),
        DynamoDBAccessPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan',
                'dynamodb:BatchGetItem',
                'dynamodb:BatchWriteItem',
                'dynamodb:DescribeTable'
              ],
              resources: [
                approvalTable.tableArn,
                `${approvalTable.tableArn}/index/*`
              ],
              sid: 'DynamoDBAccessPermissions'
            })
          ]
        })
      }
    });

    // Grant S3 permissions to the role
    dagsBucket.grantReadWrite(mwaaExecutionRole);

    // 5. Create Security Group for MWAA
    const mwaaSecurityGroup = new ec2.SecurityGroup(this, 'MwaaSecurityGroup', {
      vpc,
      description: 'Security group for MWAA environment',
      allowAllOutbound: true,
    });

    // Allow inbound traffic within the security group
    mwaaSecurityGroup.addIngressRule(
      mwaaSecurityGroup,
      ec2.Port.allTraffic(),
      'Allow all traffic within security group'
    );

    // 6. Create MWAA Environment
    const mwaaEnvironment = new mwaa.CfnEnvironment(this, 'MwaaEnvironment', {
      name: 'MyMWAAEnvironment',
      dagS3Path: 'dags',
      executionRoleArn: mwaaExecutionRole.roleArn,
      sourceBucketArn: dagsBucket.bucketArn,
      
      // Network configuration
      networkConfiguration: {
        subnetIds: vpc.privateSubnets.map(subnet => subnet.subnetId),
        securityGroupIds: [mwaaSecurityGroup.securityGroupId],
      },
      
      // Environment configuration
      environmentClass: 'mw1.small', // Smallest size for cost efficiency
      maxWorkers: 2,
      minWorkers: 1,
      
      // Airflow configuration
      airflowVersion: '2.7.2',
      webserverAccessMode: 'PUBLIC_ONLY',
      
      // Environment variables for DAGs
      airflowConfigurationOptions: {
        'core.default_timezone': 'UTC',
        'webserver.expose_config': 'True'
      },
      
      // Resource names are automatically discovered by DAGs
      // DAGs use the same naming patterns as CDK to find resources automatically
      // No manual configuration of Airflow Variables required
      
      // Logging configuration
      loggingConfiguration: {
        dagProcessingLogs: {
          enabled: true,
          logLevel: 'INFO'
        },
        schedulerLogs: {
          enabled: true,
          logLevel: 'INFO'
        },
        taskLogs: {
          enabled: true,
          logLevel: 'INFO'
        },
        webserverLogs: {
          enabled: true,
          logLevel: 'INFO'
        },
        workerLogs: {
          enabled: true,
          logLevel: 'INFO'
        }
      }
    });

    // 7. Output important information
    new CfnOutput(this, 'S3BucketName', {
      value: dagsBucket.bucketName,
      description: 'Name of the S3 bucket containing DAG files'
    });

    new CfnOutput(this, 'MwaaEnvironmentName', {
      value: mwaaEnvironment.name!,
      description: 'Name of the MWAA environment'
    });

    new CfnOutput(this, 'MwaaWebServerUrl', {
      value: `https://${mwaaEnvironment.attrWebserverUrl}`,
      description: 'MWAA Airflow Web Server URL'
    });

    new CfnOutput(this, 'DemoLambdaFunctionName', {
      value: demoLambdaFunction.functionName,
      description: 'Name of the demo Lambda function for MWAA testing'
    });

    new CfnOutput(this, 'ApprovalTableName', {
      value: approvalTable.tableName,
      description: 'Name of the DynamoDB approval table for human approval workflows'
    });
  }
}
