import { CfnParameter, Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import { Artifact, Pipeline, PipelineType } from 'aws-cdk-lib/aws-codepipeline';
import { Function, Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { ArnPrincipal, Effect, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { CodeCommitSourceAction, LambdaInvokeAction } from 'aws-cdk-lib/aws-codepipeline-actions';

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

    const pipelineRolePolicyDocument = new PolicyDocument({
      statements: [
        new PolicyStatement({
          actions: [
            'codecommit:GetBranch',
            'codecommit:GetCommit',
            'codecommit:UploadArchive',
            'codecommit:GetUploadArchiveStatus',
          ],
          effect: Effect.ALLOW,
          resources: [
            etlRepository.repositoryArn,
          ]
        })
      ]
    });

    const pipelineRole = new Role(this, 'PipelineRole', {
      assumedBy: new ServicePrincipal('codepipeline.amazonaws.com'),
      inlinePolicies: {
        pipelineRolePolicyDocument,
      }
    });

    const cloudWatchPolicy = new PolicyDocument({
      statements: [
        new PolicyStatement({
          actions: [
            'cloudwatch:*',
            'logs:*'
          ],
          effect: Effect.ALLOW,
          resources: ['*']
        })
      ]
    });

    const glueRole = new Role(this, 'GlueRole', {
      assumedBy: new ServicePrincipal('glue.amazonaws.com'),
      inlinePolicies: {
        'CloudWatch': cloudWatchPolicy
      }
    });

    const lambdaRole = new Role(this, 'LambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        'Launch': new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: [
                'glue:CreateJob',
                'glue:StartJobRun'
              ],
              effect: Effect.ALLOW,
              resources: ['*']
            }),
            new PolicyStatement({
              actions: ['iam:PassRole'],
              effect: Effect.ALLOW,
              resources: [ glueRole.roleArn]
            })
          ]
        }),
        'CloudWatch': cloudWatchPolicy,
      },
    });

    pipelineArtifactStoreEncryptionKey.addToResourcePolicy(
      new PolicyStatement({
        actions: [
          'kms:Decrypt',
          'kms:DescribeKey',
          'kms:Encrypt',
          'kms:ReEncrypt',
          'kms:GenerateDataKey'
        ],
        effect: Effect.ALLOW,
        resources: ['*'],
        principals: [
          new ArnPrincipal(pipelineRole.roleArn),
          new ArnPrincipal(lambdaRole.roleArn),
          new ArnPrincipal(glueRole.roleArn)
        ]
      })
    );

    const pipelineArtifactStore = new Artifact();

    const s3Statement = new PolicyStatement({
      actions: [
        's3:GetObject',
        's3:PutObject'
      ],
      effect: Effect.ALLOW,
      resources: [
        `${pipelineArtifactStoreBucket.bucketArn}`,
        `${pipelineArtifactStoreBucket.bucketArn}/*`
      ]
    });

    pipelineRole.addToPolicy(s3Statement);
    lambdaRole.addToPolicy(s3Statement);
    glueRole.addToPolicy(s3Statement);

    const lambda = new Function(this, 'lambda', {
      code: Code.fromAsset('lambda_etl_launch'),
      handler: 'lambda_etl_launch.lambda_handler',
      runtime: Runtime.PYTHON_3_12,
      role: lambdaRole,
      environment: {
        'REPOSITORY_NAME': etlRepository.repositoryName,
        'FILENAME': 'etl.py'
      }
    });

    pipelineRole.addToPolicy(
      new PolicyStatement({
        actions: ['lambda:InvokeFunction'],
        effect: Effect.ALLOW,
        resources: [lambda.functionArn]
      })
    );

    const pipeline = new Pipeline(this, 'Pipeline', {
      pipelineName: 'pipeline',
      role: pipelineRole,
      artifactBucket: pipelineArtifactStoreBucket,
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

    lambdaRole.addToPolicy(
      new PolicyStatement({
        actions: [
          'codepipeline:PutJobSuccessResult',
          'codepipeline:PutJobFailureResult'
        ],
        effect: Effect.ALLOW,
        resources: ['*']
      }));

    lambdaRole.addToPolicy(
      new PolicyStatement({
        actions: ['codecommit:GetFile'],
        effect: Effect.ALLOW,
        resources: [etlRepository.repositoryArn]
      }));
  };
}
