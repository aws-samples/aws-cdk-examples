import { CfnParameter, Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import { Artifact, Pipeline, PipelineType } from 'aws-cdk-lib/aws-codepipeline';
import { Function, Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { CodeCommitSourceAction, LambdaInvokeAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Effect, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';

export class CodepipelineGlueDeployStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create a CloudFormation parameter for the Glue job name to use when creating
    const glueJob = new CfnParameter(this, 'glueJob', {
      type: 'String',
      description: 'The name of the Glue job',
    });

    // Create a CodeCommit repository for the ETL code and upload
    // code from the etl directory
    const etlRepository = new codecommit.Repository(this, 'EtlRepository', {
      repositoryName: 'EtlRepository',
      code: codecommit.Code.fromDirectory('etl/'),
      description: 'EtlRepository'
    });

    // Create a KMS key for encrypting the pipeline artifact store
    // with key rotation enabled
    const pipelineArtifactStoreEncryptionKey = new Key(this, 'pipelineArtifactStoreEncryptionKey', {
      removalPolicy: RemovalPolicy.DESTROY,
      enableKeyRotation: true
    });

    // Create an S3 bucket for the pipeline artifact store
    // using the encryption key we just created
    // with server-side encryption enabled
    // and server access logs enabled for the bucket
    const pipelineArtifactStoreBucket = new Bucket(this, 'XXXXXXXXXXXXXXXXXXXXXXXXXXX', {
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: BucketEncryption.KMS,
      encryptionKey: pipelineArtifactStoreEncryptionKey,
      serverAccessLogsPrefix: 'access-logs',
      enforceSSL: true
    });

    // Create a Glue role so that we can allow lambda to pass
    // to glue ETL jobs that it creates
    const glueRole = new Role(this, 'GlueRole', {
      assumedBy: new ServicePrincipal('glue.amazonaws.com'),
    });

    // Add the necessary permissions to the Glue role to create and start ETL Jobs
    glueRole.addToPrincipalPolicy(
      new PolicyStatement({
        actions: [
          'glue:CreateJob',
          'glue:StartJobRun'
        ],
        effect: Effect.ALLOW,
        resources: ['*']
      })
    );

    // Grant the Glue role the ability to encrypt and decrypt the pipeline artifact store encryption key
    pipelineArtifactStoreEncryptionKey.grantEncryptDecrypt(glueRole)
    // Grant the Glue role the ability to read and write to the pipeline artifact store bucket
    pipelineArtifactStoreBucket.grantReadWrite(glueRole);


    // Create a Lambda function to create Glue jobs based on the files
    // in the ETL code repository 
    const lambda = new Function(this, 'lambda', {
      code: Code.fromAsset('lambda_etl_launch'),
      handler: 'lambda_etl_launch.lambda_handler',
      runtime: Runtime.PYTHON_3_12,
      environment: {
        'REPOSITORY_NAME': etlRepository.repositoryName,
        'FILENAME': 'etl.py'
      }
    });

    // Add the necessary permissions to the Lambda role to pass the glue role
    lambda.role?.addToPrincipalPolicy(
      new PolicyStatement({
        actions: [
          'iam:PassRole'
        ],
        effect: Effect.ALLOW,
        resources: [glueRole.roleArn]
      })
    );
    // Add the necessary permissions to the Lambda role to read and write from the pipeline artifact store
    pipelineArtifactStoreBucket.grantReadWrite(lambda.role!);
    pipelineArtifactStoreEncryptionKey.grantEncryptDecrypt(lambda.role!);
    
    // Create a pipeline artifact store
    const pipelineArtifactStore = new Artifact();

    // Create a CodePipeline pipeline
    const pipeline = new Pipeline(this, 'Pipeline', {
      pipelineName: 'pipeline',
      artifactBucket: pipelineArtifactStoreBucket,
      enableKeyRotation: true,
      pipelineType: PipelineType.V2,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new CodeCommitSourceAction({
              actionName: 'Source',
              repository: etlRepository,
              branch: 'main',
              output: pipelineArtifactStore,
            })
          ]
        },
        {
          stageName: 'Deploy',
          actions: [
            new LambdaInvokeAction({
              actionName: 'Deploy',
              lambda: lambda,
              inputs: [pipelineArtifactStore],
              userParameters: {
                glue_job_name: glueJob.valueAsString,
                glue_role: glueRole.roleName
              }
            })
          ]
        },
      ]
    });

    // Grant the pipeline role the ability to pull from the ETL repository
    etlRepository.grantPull(pipeline.role);
    // Grant the pipeline role the ability to invoke the Lambda function
    lambda.grantInvoke(pipeline.role);
    // Grant the pipeline role the ability to encrypt and decrypt the pipeline artifact store encryption key
    pipelineArtifactStoreEncryptionKey.grantEncryptDecrypt(pipeline.role);


  }
}
