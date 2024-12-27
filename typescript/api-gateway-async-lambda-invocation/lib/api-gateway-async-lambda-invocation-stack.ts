import * as cdk from 'aws-cdk-lib';
import { AccessLogFormat, AwsIntegration, LambdaIntegration, LambdaRestApi, LogGroupLogDestination, MethodLoggingLevel } from 'aws-cdk-lib/aws-apigateway';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import path = require('path');

export interface Properties extends cdk.StackProps {
  readonly prefix: string;
}

export class ApiGatewayAsyncLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: Properties) {
    super(scope, id, props);

    // DynamoDB table for job status
    const jobTable = new Table(this, `${props.prefix}-table`, {
      partitionKey: { name: 'jobId', type: AttributeType.STRING },
      tableName: `${props.prefix}-job-table`,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production; Set `cdk.RemovalPolicy.RETAIN` for production
    });

    // Create a Log Group for API Gateway logs
    const fnLogGroup = new LogGroup(this, `${props.prefix}-fn-log-group`, {
      retention: RetentionDays.ONE_WEEK, // Customize the retention period as needed
    });

    //  create a lambda function
    const jobHandler = new Function(this, `${props.prefix}-fn`, {
      runtime: Runtime.NODEJS_20_X,
      handler: 'job_handler.handler',
      code: Code.fromAsset(path.join(__dirname, '../assets/lambda-functions')),
      environment: {
        JOB_TABLE: jobTable.tableName,
      },
      logGroup:     fnLogGroup,
    });
    // Grant Lambda permission to write to DynamoDB
    jobTable.grantWriteData(jobHandler);

    // Create a Log Group for API Gateway logs
    const apiLogGroup = new LogGroup(this, `${props.prefix}-apigw-log-group`, {
      retention: RetentionDays.ONE_WEEK, // Customize the retention period as needed
    });

    // API Gateway: Create a REST API with Lambda integration for POST /job
    const api = new LambdaRestApi(this, `${props.prefix}-apigw`, {
      restApiName:    `${props.prefix}-job-service`,
      handler:        jobHandler,
      proxy:          false,
      cloudWatchRole: true,
      deployOptions: {
        metricsEnabled:   true,
        dataTraceEnabled: true,
        accessLogDestination: new LogGroupLogDestination(apiLogGroup),
        accessLogFormat: AccessLogFormat.jsonWithStandardFields(),
        loggingLevel:    MethodLoggingLevel.ERROR,
      }
    });

    // POST /job method (Lambda integration)
    const job = api.root.addResource('job')

    // POST /job method with asynchronous invocation
    job.addMethod("POST", 
      new LambdaIntegration(jobHandler,{
        proxy:false,
        requestParameters:{
          'integration.request.header.X-Amz-Invocation-Type': "'Event'",
        },
        requestTemplates: {
          'application/json': `{
            "jobId": "$context.requestId",
            "body": $input.json('$')
          }`,    
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': `{"jobId": "$context.requestId"}`
            }
          },
          {
            statusCode: '500',
            responseTemplates: {
              'application/json': `{
                "error": "An error occurred while processing the request.",
                "details": "$context.integrationErrorMessage"
              }`
            }
          }
        ]
    }),
  {
    methodResponses: [
      {
        statusCode: '200',
      },
      {
        statusCode: '500',
      }
    ]
  }
  );

    // GET method to check the status of a job by jobId (direct DynamoDB integration)
    const jobId = job.addResource('{jobId}');
    jobId.addMethod("GET",
      new AwsIntegration({
        service: 'dynamodb',
        action:  'GetItem',
        options: {
          credentialsRole: new Role(this, 'ApiGatewayDynamoRole',{
            assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
            inlinePolicies: {
              dynamoPolicy: new PolicyDocument({
                statements: [
                  new PolicyStatement({
                    actions: ['dynamodb:GetItem'],
                    resources: [jobTable.tableArn],
                  }),
                ],
              })
            }
          }),
          requestTemplates: {
            'application/json': `{
              "TableName": "${jobTable.tableName}",
              "Key": {
                "jobId": {
                  "S": "$input.params('jobId')"
                }
              }
            }`,  
          },
          integrationResponses: [{
            statusCode: '200',
            responseTemplates: {
              'application/json': `{
                "jobId": "$input.path('$.Item.jobId.S')",
                "status": "$input.path('$.Item.status.S')",
                "createdAt": "$input.path('$.Item.createdAt.S')"
              }`
            }
          },
          {
            statusCode: '404',
            selectionPattern: '.*"Item":null.*',
            responseTemplates: {
              'application/json': '{"error": "Job not found"}'
            }
          }
        ]
      }
    }),
    {
      methodResponses:[
        {
          statusCode: '200'
        },
        {
          statusCode: '404'
        }
      ]
    });
  }
}