import { aws_cloudfront_origins, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipelineActions from 'aws-cdk-lib/aws-codepipeline-actions';
import { Construct } from 'constructs';

export class FrontendCicdStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const pipeLine = new codepipeline.Pipeline(this, 'MyFrontEndPipeline', {
      pipelineName: 'MyFrontEndPipeline'
    });

    // Source
    const repository = new codecommit.Repository(this, 'MyFrontEndRepo', {
      repositoryName: 'MyFrontEndRepo',
      description: 'My Frontend Repository'
    });

    const sourceOutput = new codepipeline.Artifact();
    const sourceAction = new codepipelineActions.CodeCommitSourceAction({
      actionName: 'CodeCommit',
      repository: repository,
      branch: 'master',   //or main
      output: sourceOutput
    });
    pipeLine.addStage({
      stageName: 'Source',
      actions: [sourceAction],
    });
    //

    // Build
    const project = new codebuild.Project(this, 'MyFrontEndBuild', {
      source: codebuild.Source.codeCommit({ repository }),
      buildSpec: codebuild.BuildSpec.fromSourceFilename('./buildspec.yaml'),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true
      },
      environmentVariables: {
        tag: {
          value: 'cdk'
        }
      }
    });

    const buildOutput = new codepipeline.Artifact();
    const buildAction = new codepipelineActions.CodeBuildAction({
      actionName: 'CodeBuild',
      project: project,
      input: sourceOutput,
      outputs: [buildOutput],
      // executeBatchBuild: true,
      // combineBatchBuildArtifacts: true
    });
    pipeLine.addStage({
      stageName: 'Build',
      actions: [buildAction],
    });

    // Change bucket name global unique.
    const bucket = new s3.Bucket(this, '<YOUR UNIQUE BUCKET NAME>', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicPolicy: true
      }),
      removalPolicy: RemovalPolicy.DESTROY, //Auto delete bucket when CFN destroyed.
      autoDeleteObjects: true,              //Auto delete objects when CFN destroyed.
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED
    });
    bucket.addToResourcePolicy(new iam.PolicyStatement({
      actions: [
        's3:*'
      ],
      resources: [bucket.arnForObjects('*')],
      principals: [new iam.AccountRootPrincipal()]
    }));

    const deployAction = new codepipelineActions.S3DeployAction({
      actionName: 'S3Deploy',
      bucket: bucket,
      input: buildOutput
    });
    pipeLine.addStage({
      stageName: 'Deploy',
      actions: [deployAction]
    });

    // CodePipeline does not natively support CF Invalidation after S3 deployment
    // You should put CodeBuild on Deployment stage and run invalidation CLI script if you want to automate
    // https://docs.aws.amazon.com/cdk/api/v1/docs/aws-codepipeline-actions-readme.html#aws-s3-deployment
    const cf = new cloudfront.Distribution(this, 'myCloudFront', {
      defaultBehavior: {
        origin: new aws_cloudfront_origins.S3Origin(bucket),    //Automatically Put OAI for S3 Bucket
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: new cloudfront.CachePolicy(this, 'myCachePolicy', {
          cachePolicyName: 'MyCachePolicy',
          comment: 'Default cache policy for web-frontend',
          defaultTtl: Duration.days(1),
          maxTtl: Duration.days(7),
          cookieBehavior: cloudfront.CacheCookieBehavior.all(),
          // headerBehavior: cloudfront.CacheHeaderBehavior.allowList('X-CustomHeader'),
          enableAcceptEncodingGzip: true,
          enableAcceptEncodingBrotli: true
        }),
      }
    });
    // cf.addBehavior('*')
  }
}
