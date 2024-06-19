import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CodePipeline, CodePipelineSource, ManualApprovalStep, ShellStep, Wave } from 'aws-cdk-lib/pipelines';
import { pipelineAppStage } from './pipeline-app-stage';

export class pipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const githubOrg       = process.env.GITHUB_ORG       || "jfan9";
    const githubRepo      = process.env.GITHUB_REPO      || "jfan9-aws-cdk-examples";
    const githubBranch    = process.env.GITHUB_BRANCH    || "issue#820";
    const devEnv          = process.env.DEV_ENV          || "dev";

    const pipeline = new CodePipeline(this, 'pipeline', {
      selfMutation:     true,
      crossAccountKeys: true,
      reuseCrossRegionSupportStacks: true,
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.connection(`${githubOrg}/${githubRepo}`, `${githubBranch}`,{
          // You need to replace the below code connection:
          connectionArn: `arn:aws:codestar-connections:ap-southeast-2:${props?.env?.account}:connection/0ce75950-a29b-4ee4-a9d3-b0bad3b2c0a6`
        }),
        commands: [
          'cd typescript/aws-codepipeline-ecs-lambda',
          'npm ci',
          'npm run build',
          'npx cdk synth'
        ]
      })
    });

    const devStage = pipeline.addStage(new pipelineAppStage(this, `${devEnv}`, {
      env: { account: props?.env?.account, region: props?.env?.region}
    }));
    devStage.addPost(new ManualApprovalStep('approval'));
  }
}