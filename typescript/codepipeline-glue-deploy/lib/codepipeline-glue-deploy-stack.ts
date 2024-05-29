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

    const glueJob = new CfnParameter(this, 'glueJob', {
      type: 'String',
      description: 'The name of the Glue job',
    });

    const etlRepository = new codecommit.Repository(this, 'EtlRepository', {
      repositoryName: 'EtlRepository',
      code: codecommit.Code.fromDirectory('etl/'),
      description: 'EtlRepository'
    });

    const pipelineArtifactStoreEncryptionKey = new Key(this, 'pipelineArtifactStoreEncryptionKey', {
      removalPolicy: RemovalPolicy.DESTROY,
      enableKeyRotation: true
    });

    const pipelineArtifactStoreBucket = new Bucket(this, 'pipelineArtifactStoreBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: BucketEncryption.KMS,
      encryptionKey: pipelineArtifactStoreEncryptionKey,
      serverAccessLogsPrefix: 'access-logs',
      enforceSSL: true
    });
    

    const glueRole = new Role(this, 'GlueRole', {
      assumedBy: new ServicePrincipal('glue.amazonaws.com'),
    });



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
    pipelineArtifactStoreEncryptionKey.grantEncryptDecrypt(glueRole)
    pipelineArtifactStoreBucket.grantReadWrite(glueRole);


    const lambda = new Function(this, 'lambda', {
      code: Code.fromAsset('lambda_etl_launch'),
      handler: 'lambda_etl_launch.lambda_handler',
      runtime: Runtime.PYTHON_3_12,
      environment: {
        'REPOSITORY_NAME': etlRepository.repositoryName,
        'FILENAME': 'etl.py'
      }
    });

    lambda.role?.addToPrincipalPolicy(
      new PolicyStatement({
        actions: [
          'iam:PassRole'
        ],
        effect: Effect.ALLOW,
        resources: [glueRole.roleArn]
      })
    );
    pipelineArtifactStoreBucket.grantReadWrite(lambda.role!);
    pipelineArtifactStoreEncryptionKey.grantEncryptDecrypt(lambda.role!);

    

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
              output: new Artifact(),
            })
          ]
        },
        {
          stageName: 'Deploy',
          actions: [
            new LambdaInvokeAction({
              actionName: 'Deploy',
              lambda: lambda,
              inputs: [new Artifact()],
              userParameters: {
                glue_job_name: glueJob.valueAsString,
                glue_role: glueRole.roleName
              }
            })
          ]
        },
      ]
    });
    
    etlRepository.grantPull(pipeline.role);

    lambda.grantInvoke(pipeline.role);
    pipelineArtifactStoreEncryptionKey.grantEncryptDecrypt(pipeline.role)
  }
}
