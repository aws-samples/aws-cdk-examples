import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3ObjectLambda from '@aws-cdk/aws-s3objectlambda';

// configurable variables
const S3_ACCESS_POINT_NAME = 'example-test-ap'
const OBJECT_LAMBDA_ACCESS_POINT_NAME = 's3-object-lambda-ap'

export class S3ObjectLambdaStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const accessPoint = `arn:aws:s3:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:accesspoint/${S3_ACCESS_POINT_NAME}`;

    // Set up a bucket
    const bucket = new s3.Bucket(this, 'example-bucket', {
      accessControl: s3.BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    });

    // Delegating access control to access points
    // https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-points-policies.html
    bucket.addToResourcePolicy(new iam.PolicyStatement({
        actions: ['*'],
        principals: [new iam.AnyPrincipal()],
        resources: [
          bucket.bucketArn,
          bucket.arnForObjects('*')
        ],
        conditions: {
          'StringEquals':
            {
              's3:DataAccessPointAccount': `${cdk.Aws.ACCOUNT_ID}`
            }
        }
      }
    ));

    // lambda to process our objects during retrieval
    const retrieveTransformedObjectLambda = new lambda.Function(this, 'retrieveTransformedObjectLambda', {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset('resources/retrieve-transformed-object-lambda')
      }
    );

    // Object lambda s3 access
    retrieveTransformedObjectLambda.addToRolePolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ['*'],
        actions: ['s3-object-lambda:WriteGetObjectResponse']
      }
    ));
    // Restrict Lambda to be invoked from own account
    retrieveTransformedObjectLambda.addPermission('invocationRestriction', {
      action: 'lambda:InvokeFunction',
      principal: new iam.AccountRootPrincipal(),
      sourceAccount: cdk.Aws.ACCOUNT_ID
    });

    // Associate Bucket's access point with lambda get access
    const policyDoc = new iam.PolicyDocument();
    const policyStatement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:GetObject'],
      principals: [
        new iam.ArnPrincipal(<string>retrieveTransformedObjectLambda.role?.roleArn)
      ],
      resources: [`${accessPoint}/object/*`]
    });
    policyStatement.sid = 'AllowLambdaToUseAccessPoint';
    policyDoc.addStatements(policyStatement);

    new s3.CfnAccessPoint(this, 'exampleBucketAP', {
        bucket: bucket.bucketName,
        name: S3_ACCESS_POINT_NAME,
        policy: policyDoc
      }
    );

    // Access point to receive GET request and use lambda to process objects
    const objectLambdaAP = new s3ObjectLambda.CfnAccessPoint(this, 's3ObjectLambdaAP', {
        name: OBJECT_LAMBDA_ACCESS_POINT_NAME,
        objectLambdaConfiguration: {
          supportingAccessPoint: accessPoint,
          transformationConfigurations: [{
            actions: ['GetObject'],
            contentTransformation: {
              'AwsLambda': {
                'FunctionArn': `${retrieveTransformedObjectLambda.functionArn}`
              }
            }
          }]
        }
      }
    );

    new cdk.CfnOutput(this, 'exampleBucketArn', {value: bucket.bucketArn});
    new cdk.CfnOutput(this, 'objectLambdaArn', {value: retrieveTransformedObjectLambda.functionArn});
    new cdk.CfnOutput(this, 'objectLambdaAccessPointArn', {value: objectLambdaAP.attrArn});
    new cdk.CfnOutput(this, 'objectLambdaAccessPointUrl', {
      value: `https://console.aws.amazon.com/s3/olap/${cdk.Aws.ACCOUNT_ID}/${OBJECT_LAMBDA_ACCESS_POINT_NAME}?region=${cdk.Aws.REGION}`
    });
  }
}
