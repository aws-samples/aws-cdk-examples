#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import codecommit= require('@aws-cdk/aws-codecommit');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import codepipeline_actions = require('@aws-cdk/aws-codepipeline-actions');
import iam = require('@aws-cdk/aws-iam');
import s3 = require('@aws-cdk/aws-s3');
import kms = require('@aws-cdk/aws-kms');
 
const app = new cdk.App();
const devEnv = {region: 'us-west-2', account: '123123123123'} 
const toolEnv = {region: 'us-west-2', account: '776362166164'}
 
// Source Stack
const srcStack = new cdk.Stack(app, 'srcStack', { env: devEnv });
 
const srcRepo = codecommit.Repository.fromRepositoryArn(srcStack, 'srcRepo', 'arn:aws:codecommit:us-west-2:363575151959:omnisearch')
 
const srcRepoRole = new iam.Role(srcStack, 'CrossAccountRole', {
  roleName: 'CrossAccountRoleName', 
  assumedBy: new iam.AccountPrincipal(toolEnv['account']),
});
 
var srcCrossPolicy = new iam.PolicyStatement();
srcCrossPolicy.addAllResources();
srcCrossPolicy.addActions('codecommit:*');
srcRepoRole.addToPolicy(srcCrossPolicy);
 
//  Pipeline Stack
const pipeStack = new cdk.Stack(app, 'pipeStack', { env: toolEnv });
const sourceOutput = new codepipeline.Artifact();
var pipeline = new codepipeline.Pipeline(pipeStack, 'Pipeline', {
  artifactBucket: new s3.Bucket(pipeStack, 'Bucket', {
    bucketName: 'castaren-test-artifact-bucket',
    encryption: s3.BucketEncryption.KMS,
    encryptionKey: new kms.Key(pipeStack, 'CrossAccountKmsKey',
 {
    removalPolicy: cdk.RemovalPolicy.DESTROY,
  }
),
  }),
  stages: [
    {
      stageName: 'Source',
      actions: [
        new codepipeline_actions.CodeCommitSourceAction({
          actionName: 'Source',
          repository: srcRepo,
          output: sourceOutput,
        }),
      ],
    },
    // pipelines must have a minimum of 2 stages
    { 
      stageName: 'Dummyapproval',
      actions: [
        new codepipeline_actions.ManualApprovalAction({
          actionName: 'ManualApproval',
        }),
      ],
    },
]});
    
var pipeCrossPolicy = new iam.PolicyStatement()
pipeCrossPolicy.addResources(srcRepoRole.roleArn);
pipeCrossPolicy.addActions('sts:AssumeRole');
pipeline.addToRolePolicy(pipeCrossPolicy);
