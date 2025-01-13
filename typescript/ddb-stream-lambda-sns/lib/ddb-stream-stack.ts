import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { DynamoDBStreamsToLambda } from '@aws-solutions-constructs/aws-dynamodbstreams-lambda';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as sqs from 'aws-cdk-lib/aws-sqs';

export class DdbStreamStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const aws_sns_kms_key = kms.Alias.fromAliasName(
      this,
      "aws-managed-sns-kms-key",
      "alias/aws/sns",
    )

    const snsTopic = new sns.Topic(this, 'ddb-stream-topic', {
      topicName: 'ddb-stream-topic',
      displayName: 'SNS Topic for DDB streams',
      enforceSSL: true,
      masterKey: aws_sns_kms_key,
    });

    //L2 CDK Construct
    const deadLetterQueueL2 = new sqs.Queue(this, 'ddb-stream-l2-dlq', {
      queueName: 'ddb-stream-l2-dlq',
      encryption: sqs.QueueEncryption.KMS_MANAGED,
      retentionPeriod: cdk.Duration.days(4), // Adjust retention period as needed
    });

    const itemL2Table = new dynamodb.Table(this, 'itemL2Table', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      //If you wish to retain the table after running cdk destroy, comment out the line below
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const itemL2TableLambdaFunction = new lambda.Function(this, 'itemL2TableLambdaFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      tracing: lambda.Tracing.ACTIVE,
      code: lambda.Code.fromAsset('resources/lambda'),
      environment: {
        SNS_TOPIC_ARN: snsTopic.topicArn,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1'
      },
    });
    itemL2TableLambdaFunction.addEventSource(new lambdaEventSources.DynamoEventSource(itemL2Table, {
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      onFailure: new lambdaEventSources.SqsDlq(deadLetterQueueL2),
      bisectBatchOnError: true,
      maxRecordAge: cdk.Duration.hours(24),
      retryAttempts: 500,
    }));

    deadLetterQueueL2.grantSendMessages(itemL2TableLambdaFunction);

    itemL2Table.grantStreamRead(itemL2TableLambdaFunction);

    //L3 CDK Construct
    const itemL3Table = new DynamoDBStreamsToLambda(this, 'itemL3Table', {
      dynamoTableProps: {
        partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
        stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
        //If you wish to retain the table after running cdk destroy, comment out the line below
        removalPolicy: cdk.RemovalPolicy.DESTROY
      },
      lambdaFunctionProps: {
        code: lambda.Code.fromAsset('resources/lambda'),
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'index.handler',
        environment: {
          SNS_TOPIC_ARN: snsTopic.topicArn,
        },
      },
    });

    snsTopic.grantPublish(itemL2TableLambdaFunction);
    snsTopic.grantPublish(itemL3Table.lambdaFunction);

    new cdk.CfnOutput(this, 'itemL2TableLambdaFunctionArn', { value: itemL2TableLambdaFunction.functionArn });
    new cdk.CfnOutput(this, 'itemL3TableLambdaFunctionArn', { value: itemL3Table.lambdaFunction.functionArn });
    new cdk.CfnOutput(this, 'l3TableArn', { value: itemL3Table.dynamoTableInterface.tableArn });
    new cdk.CfnOutput(this, 'l2TableArn', { value: itemL2Table.tableArn });
    new cdk.CfnOutput(this, 'topicArn', { value: snsTopic.topicArn });
    new cdk.CfnOutput(this, 'l2DLQArn', { value: deadLetterQueueL2.queueArn })
  }
}
