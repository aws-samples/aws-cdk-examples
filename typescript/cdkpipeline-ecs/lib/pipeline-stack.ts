import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as pipelines from 'aws-cdk-lib/pipelines';
import { ECSStack } from './ecs-stack';
import { VpcStack } from './infra-stack';

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pipeline = new pipelines.CodePipeline(this, 'Pipeline', {
      synth: new pipelines.ShellStep('Synth', {
        input: pipelines.CodePipelineSource.connection('org/reponame', 'branchname', {
          connectionArn: 'arn:aws:codestar-connections:us-east-1:123456789012:connection/abcdefg',
        }),
        commands: [
          'npm ci',
          'npm run build',
          'npx cdk synth',
        ],
      }),
      selfMutation: true,
    });

    const wave = pipeline.addWave('DeployWave');

    wave.addStage(new AppStacks(this, 'AppsUS', {
      env: { account: props?.env?.account, region: 'us-east-1' }
    }));
    wave.addStage(new AppStacks(this, 'AppsEU', {
      env: { account: props?.env?.account, region: 'eu-west-1' }
    }));

  }
}

export class AppStacks extends cdk.Stage {
  constructor(scope: Construct, id: string, props?: cdk.StageProps) {
    super(scope, id, props);

    const vpcStack = new VpcStack(this, 'VPCStack', { env: props?.env })

    const ecsStack = new ECSStack(this, 'ECSStack', { env: props?.env, vpc: vpcStack.vpc });

  }
}