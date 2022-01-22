import * as cdk from 'aws-cdk-lib';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from "constructs";
import * as path from 'path';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';

export class RekognitionLambdaS3TriggerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create S3 Bucket
    const bucket = new s3.Bucket(this, 'Bucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // create DynamoDB table to hold Rekognition results
    const table = new Table(this, 'Classifications', {
      partitionKey: {
        name: 'image_name',
        type: AttributeType.STRING
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY // removes table on cdk destroy
    });


    // create Lambda function
    const lambdaFunction = new lambda.Function(this, 'RekFunction', {
      handler: 'rekfunction.handler',
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      environment: {
        'BUCKET_NAME': bucket.bucketName,
        'TABLE_NAME': table.tableName
      }
    });

    // add Rekognition permissions for Lambda function
    const statement = new iam.PolicyStatement();
    statement.addActions("rekognition:DetectLabels");
    statement.addResources("*");
    lambdaFunction.addToRolePolicy(statement);

    // create trigger for Lambda function with image type suffixes
    bucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(lambdaFunction),{suffix: '.jpg'});
    bucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(lambdaFunction),{suffix: '.jpeg'});
    bucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(lambdaFunction),{suffix: '.png'});

    // grant permissions for lambda to read/write to DynamoDB table and bucket
    table.grantReadWriteData(lambdaFunction);
    bucket.grantReadWrite(lambdaFunction);
        
  }
}
