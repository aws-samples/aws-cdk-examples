import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as path from 'path';

export class PostgresLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a VPC for our application
    const vpc = new ec2.Vpc(this, 'PostgresLambdaVpc', {
      maxAzs: 2,
      natGateways: 1,
    });

    // Create a PostgreSQL Aurora Serverless v2 cluster
    const dbCluster = new rds.DatabaseCluster(this, 'PostgresCluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_17_4,
      }),
      vpc: vpc,
      writer: rds.ClusterInstance.serverlessV2('writer'),
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 1,
      defaultDatabaseName: 'demodb',
      credentials: rds.Credentials.fromGeneratedSecret('postgres'),
    });

    const bundleCommand = [
            'bash', '-c', [
              'cp -r . /asset-output/',
            ].join(' && ')
          ]

    // Create a Lambda function that calls PostgreSQL with Docker bundling
    const lambdaToPostgres = new lambda.Function(this, 'LambdaToPostgres', {
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/lambda-to-postgres'), {
        bundling: {
          image: lambda.Runtime.NODEJS_LATEST.bundlingImage,
          command: bundleCommand,
        },
      }),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      environment: {
        DB_SECRET_ARN: dbCluster.secret?.secretArn || '',
        DB_NAME: 'demodb',
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant Lambda access to the DB
    dbCluster.connections.allowDefaultPortFrom(lambdaToPostgres);

    // Grant the Lambda function permission to read the database secret
    dbCluster.secret?.grantRead(lambdaToPostgres);

    // Create a Lambda function that is called by PostgreSQL
    const postgresFunction = new lambda.Function(this, 'PostgresFunction', {
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/postgres-to-lambda'), {
        bundling: {
          image: lambda.Runtime.NODEJS_LATEST.bundlingImage,
          command: bundleCommand,
        },
      }),
      environment: {
        FUNCTION_NAME: 'PostgresFunction',
      },
      timeout: cdk.Duration.seconds(30),
    });


    // Create a role for PostgreSQL to assume to invoke Lambda
    const postgresLambdaRole = new iam.Role(this, 'PostgresLambdaRole', {
      assumedBy: new iam.ServicePrincipal('rds.amazonaws.com'),
    });

    postgresFunction.grantInvoke(postgresLambdaRole);


    const l1DbCluster = dbCluster.node.defaultChild as rds.CfnDBCluster
    const exisitingProperty = (l1DbCluster.associatedRoles as []) || [];
    console.log(exisitingProperty);

    const newRole: { FeatureName: string, RoleArn: string } = {
      FeatureName: "Lambda",  // Changed to PascalCase
      RoleArn: postgresLambdaRole.roleArn  // Changed to PascalCase
    };

    const updatedRoles: { [key in 'featureName' | 'FeatureName' | 'roleArn' | 'RoleArn']?: string; }[] = [...exisitingProperty, newRole];

    l1DbCluster.addPropertyOverride('AssociatedRoles', updatedRoles);

    // Create Lambda function for PostgreSQL setup with Docker bundling
    const setupFunction = new lambda.Function(this, 'PostgresSetupFunction', {
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/postgres-setup'), {
        bundling: {
          image: lambda.Runtime.NODEJS_LATEST.bundlingImage,
          command: bundleCommand,
        },
      }),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      environment: {
        DB_SECRET_ARN: dbCluster.secret?.secretArn || '',
        DB_NAME: 'demodb',
        POSTGRES_FUNCTION_NAME: postgresFunction.functionName,
      },
      timeout: cdk.Duration.minutes(5),
    });

    // Grant setup function access to the DB and secrets
    dbCluster.connections.allowDefaultPortTo(setupFunction);
    dbCluster.secret?.grantRead(setupFunction);

    // Create custom resource to trigger setup
    const setupProvider = new cr.Provider(this, 'PostgresSetupProvider', {
      onEventHandler: setupFunction,
    });

    new cdk.CustomResource(this, 'PostgresSetupResource', {
      serviceToken: setupProvider.serviceToken,
    });

    // Output the database endpoint and secret ARN
    new cdk.CfnOutput(this, 'DBClusterEndpoint', {
      value: dbCluster.clusterEndpoint.hostname,
      description: 'The endpoint of the database cluster',
    });

    new cdk.CfnOutput(this, 'DBSecretArn', {
      value: dbCluster.secret?.secretArn || 'No secret created',
      description: 'The ARN of the database credentials secret',
    });

    new cdk.CfnOutput(this, 'LambdaToPostgresFunctionName', {
      value: lambdaToPostgres.functionName,
      description: 'The name of the Lambda function that calls PostgreSQL',
    });

    new cdk.CfnOutput(this, 'PostgresFunctionName', {
      value: postgresFunction.functionName,
      description: 'The name of the Lambda function that is called by PostgreSQL',
    });

    new cdk.CfnOutput(this, 'PostgresLambdaRoleArn', {
      value: postgresLambdaRole.roleArn,
      description: 'The ARN of the role that PostgreSQL can assume to invoke Lambda',
    });
  }
}
