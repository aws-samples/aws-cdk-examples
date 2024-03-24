import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as codebuild from 'aws-cdk-lib/aws-codebuild'; 
import * as codecommit from 'aws-cdk-lib/aws-codecommit';

export class PipelineDemoStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    
    const sourceRepo = codecommit.Repository.fromRepositoryArn(
      this,
      'SourceRepo',
      'arn:aws:codecommit:us-east-1:XXXXXXXXXXXX:repo-test', // Add your cross account repository arn 
    );
  
    // Define the IAM role to access GitHub repository in the source account
    const sourceAccountRole = new iam.Role(this, 'SourceAccountRole', {
      assumedBy: new iam.ServicePrincipal('codepipeline.amazonaws.com'),
    });

    // Attach a policy to the source account role granting necessary permissions to access GitHub
    sourceAccountRole.addToPolicy(new iam.PolicyStatement({
      actions: ['codepipeline:PollForSourceChanges', 'codepipeline:GetPipelineExecution'],
      resources: ['*'], // Adjust as necessary
    }));

    const pipeline = new codepipeline.Pipeline(this, 'MyPipeline', {
      pipelineName: 'MyPipeline',
      role: sourceAccountRole,
    });


    const myRole = iam.Role.fromRoleArn(this, 'Role',
        'arn:aws:iam::XXXXXXXXXXXX:role/crossaccount-codecommit');  // Add your cross account role arn 
    
    // Define the source action to pull code from GitHub
    const sourceOutput = new codepipeline.Artifact();
    const sourceAction = new codepipeline_actions.CodeCommitSourceAction({
      actionName: 'codecommit_Source',
      repository: sourceRepo,
      output: sourceOutput,
      role : myRole,
      trigger: codepipeline_actions.CodeCommitTrigger.POLL,
    });

    // Add source stage to the pipeline
    pipeline.addStage({
      stageName: 'Source',
      actions: [sourceAction],
    });

    // Define the build stage (assuming you're using AWS CodeBuild)
    const buildStage = pipeline.addStage({
      stageName: 'Build',
    });

    // Define the build project
    const buildProject = new codebuild.PipelineProject(this, 'MyBuildProject', {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          build: {
            commands: [
              'ls', // Adjust this according to your build process
            ],
          },
        },
        artifacts: {
          'base-directory': 'build', // Adjust this according to your build output directory
          files: [
            '*/',
          ],
        },
      }),
    });

    // Add build project to the build stage
    buildStage.addAction(new codepipeline_actions.CodeBuildAction({
      actionName: 'CodeBuild',
      project: buildProject,
      input: sourceOutput,
    }));
  }
}