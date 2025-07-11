import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as path from 'path';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';

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

    // Create a Lambda function that calls PostgreSQL using NodejsFunction
    const lambdaToPostgres = new nodejs.NodejsFunction(this, 'LambdaToPostgres', {
      runtime: lambda.Runtime.NODEJS_LATEST,
      entry: path.join(__dirname, '../lambda/lambda-to-postgres/index.js'),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      environment: {
        DB_SECRET_ARN: dbCluster.secret?.secretArn || '',
        DB_NAME: 'demodb',
      },
      bundling: {
        externalModules: [
          'aws-sdk', // Use the AWS SDK available in the Lambda runtime
        ],
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant Lambda access to the DB
    dbCluster.connections.allowDefaultPortTo(lambdaToPostgres);

    // Grant the Lambda function permission to read the database secret
    dbCluster.secret?.grantRead(lambdaToPostgres);

    // Create a Lambda function that is called by PostgreSQL using NodejsFunction
    const postgresFunction = new nodejs.NodejsFunction(this, 'PostgresFunction', {
      runtime: lambda.Runtime.NODEJS_LATEST,
      entry: path.join(__dirname, '../lambda/postgres-to-lambda/index.js'),
      environment: {
        FUNCTION_NAME: 'PostgresFunction',
      },
      bundling: {
        externalModules: [
          'aws-sdk', // Use the AWS SDK available in the Lambda runtime
        ],
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

    // Create Lambda function for PostgreSQL setup using NodejsFunction
    const setupFunction = new nodejs.NodejsFunction(this, 'PostgresSetupFunction', {
      runtime: lambda.Runtime.NODEJS_LATEST,
      entry: path.join(__dirname, '../lambda/postgres-setup/index.js'),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      environment: {
        DB_SECRET_ARN: dbCluster.secret?.secretArn || '',
        DB_NAME: 'demodb',
        POSTGRES_FUNCTION_NAME: postgresFunction.functionName,
      },
      bundling: {
        externalModules: [
          'aws-sdk', // Use the AWS SDK available in the Lambda runtime
        ],
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
