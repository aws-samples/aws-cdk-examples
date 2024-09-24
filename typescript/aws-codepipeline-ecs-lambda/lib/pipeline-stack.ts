import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CodePipeline, CodePipelineSource, ManualApprovalStep, ShellStep, Wave } from 'aws-cdk-lib/pipelines';
import { pipelineAppStage } from './stage-app';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

export class pipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pipelineAccountId = process.env.PIPELINE_ACCOUNT_ID || "111111111111";                 // replace with your pipeline account id
    const pipelineRegion    = process.env.PIPELINE_REGION     || "us-east-1";                    // replace with your pipeline region
    const githubOrg         = process.env.GITHUB_ORG          || "aws-6w8hnx";                   // replace with your GitHub Org
    const githubRepo        = process.env.GITHUB_REPO         || "aws-codepipeline-ecs-lambda";  // replace with your GitHub Repo
    const githubBranch      = process.env.GITHUB_BRANCH       || "main";                         // replace with your GitHub repo branch
    const devEnv            = process.env.DEV_ENV             || "dev";                          // replace with your environment
    const devAccountId      = process.env.DEV_ACCOUNT_ID      || "222222222222";                 // replace with your dev account id
    const primaryRegion     = process.env.PRIMARY_REGION      || "us-west-2";                    // replace with your primary region
    const secondaryRegion   = process.env.SECONDARY_REGION    || "eu-west-1";                    // replace with your secondary region
    
    const pipeline = new CodePipeline(this, 'pipeline', {
      selfMutation:     true,
      crossAccountKeys: true,
      reuseCrossRegionSupportStacks: true,
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.connection(`${githubOrg}/${githubRepo}`, `${githubBranch}`,{
          // You need to replace the below code connection arn:
          connectionArn: `arn:aws:codestar-connections:${pipelineRegion}:${pipelineAccountId}:connection/0ce75950-a29b-4ee4-a9d3-b0bad3b2c0a6`
        }),
        commands: [
          'npm ci',
          'npm run build',
          'npx cdk synth'
        ]
      }),
      synthCodeBuildDefaults: {
        rolePolicy: [
          new PolicyStatement({
            resources: [ '*' ],
            actions: [ 'ec2:DescribeAvailabilityZones' ],
          }),
      ]}
    });

    const devStage = pipeline.addStage(new pipelineAppStage(this, `${devEnv}`, {
      env: { account: `${pipelineAccountId}`, region: `${pipelineRegion}`}
    }));
    devStage.addPost(new ManualApprovalStep('approval'));

    // add waves:
    const devWave = pipeline.addWave(`${devEnv}Wave`);

    devWave.addStage(new pipelineAppStage(this, `${devEnv}-${primaryRegion}`, {
      env: { account: `${devAccountId}`, region: `${primaryRegion}`}
    }));

    devWave.addStage(new pipelineAppStage(this, `${devEnv}-${secondaryRegion}`, {
      env: { account: `${devAccountId}`, region: `${secondaryRegion}`}
    }));
  }
}
