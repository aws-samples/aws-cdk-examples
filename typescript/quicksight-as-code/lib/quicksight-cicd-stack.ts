import { Construct } from 'constructs';
import { StackProps, Stack, Stage } from 'aws-cdk-lib';
import { CodeBuildStep, CodePipeline, CodePipelineSource } from 'aws-cdk-lib/pipelines';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { QuicksightCodeStack } from './quicksight-code-stack';

// Class representing a deployment stage for QuickSight artifacts
class QuicksightArtifactsStage extends Stage {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);
    // Create a new QuickSightCodeStack within this stage
    new QuicksightCodeStack(this, 'quicksight-artifacts-stack', props);
  }
}

// Class representing the CI/CD stack for QuickSight
// This class is a very simple proof of concept that you can automatically deploy CDK Generated Quicksight artifacts
// Normally your delivery pipelines will span several stages and deploy to many environments, e.g. TEST, PROD etc
export class QuicksightCicdStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Retrieve the GitHub connection ARN from SSM Parameter Store
    // Modify this line according to your needs to point where your code source comes from
    const githubConnectionArn = StringParameter.valueForStringParameter(this, '/gmournos/github/connection/arn');

    // Define the source of the pipeline from the GitHub repository
    const quicksightSource = CodePipelineSource.connection('gmournos/quicksight-as-code', "main", {
      connectionArn: githubConnectionArn,
      triggerOnPush: true, // Trigger the pipeline on push to the main branch
    });

    // Create a new CodePipeline
    const pipeline = new CodePipeline(this, "quicksight-cicd-pipeline", {
      pipelineName: "Quicksight_CICD_Pipeline",
      // Define the synthesis step
      synth: new CodeBuildStep("synth-step", {
        input: quicksightSource, // Input source for the pipeline
        installCommands: ["npm install -g aws-cdk"], // Commands to install CDK
        commands: ["npm install", "npm run build", "npx cdk synth"], // Build and synthesize the CDK app
      }),
    });

    // Add a deployment stage to the pipeline
    pipeline.addStage(new QuicksightArtifactsStage(this, 'quicksight-artifacts-deploy', {
      env: {
        account: this.account,
        region: this.region,
      }
    }));
  }
}
