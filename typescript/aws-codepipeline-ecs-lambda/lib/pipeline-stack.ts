import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CodePipeline, CodePipelineSource, ManualApprovalStep, ShellStep, Wave } from 'aws-cdk-lib/pipelines';
import { pipelineAppStage } from './stage-app';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

export interface pipelineProps extends cdk.StackProps {
  readonly pipelineAccountId: string;
  readonly pipelineRegion: string;
  readonly githubOrg: string;
  readonly githubRepo: string;
  readonly githubBranch: string;
  readonly devEnv: string;
  readonly devAccountId: string;
  readonly primaryRegion: string;
  readonly secondaryRegion: string;
}

export class pipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: pipelineProps) {
    super(scope, id, props);
    
    const pipeline = new CodePipeline(this, 'pipeline', {
      selfMutation:     true,
      crossAccountKeys: true,
      reuseCrossRegionSupportStacks: true,
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.connection(`${props.githubOrg}/${props.githubRepo}`, `${props.githubBranch}`,{
          // You need to replace the below code connection arn:
          connectionArn: `arn:aws:codestar-connections:${props.pipelineRegion}:${props.pipelineAccountId}:connection/0ce75950-a29b-4ee4-a9d3-b0bad3b2c0a6`
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

    const devStage = pipeline.addStage(new pipelineAppStage(this, `${props.devEnv}`, {
      env: { account: `${props.pipelineAccountId}`, region: `${props.pipelineRegion}`}
    }));
    devStage.addPost(new ManualApprovalStep('approval'));

    // add waves:
    const devWave = pipeline.addWave(`${props.devEnv}Wave`);

    devWave.addStage(new pipelineAppStage(this, `${props.devEnv}-${props.primaryRegion}`, {
      env: { account: `${props.devAccountId}`, region: `${props.primaryRegion}`}
    }));

    devWave.addStage(new pipelineAppStage(this, `${props.devEnv}-${props.secondaryRegion}`, {
      env: { account: `${props.devAccountId}`, region: `${props.secondaryRegion}`}
    }));
  }
}
