import * as cdk from "aws-cdk-lib";
import * as codecommit from "aws-cdk-lib/aws-codecommit";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import * as path from "path";

export class CodepipelineBuildDeployStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Creates an AWS CodeCommit repository
    const codeRepo = new codecommit.Repository(this, "codeRepo", {
      repositoryName: "simple-app-code-repo",
      // Copies files from ./app directory to the repo as the initial commit
      code: codecommit.Code.fromDirectory(
        path.join(__dirname, "../app"),
        "main"
      ),
    });

    // Creates an Elastic Container Registry (ECR) image repository
    const imageRepo = new ecr.Repository(this, "imageRepo");

    // Creates a Task Definition for the ECS Fargate service
    const fargateTaskDef = new ecs.FargateTaskDefinition(
      this,
      "FargateTaskDef"
    );
    fargateTaskDef.addContainer("container", {
      containerName: "web",
      image: ecs.ContainerImage.fromEcrRepository(imageRepo),
      portMappings: [{ containerPort: 80 }],
    });

    // CodeBuild project that builds the Docker image
    const buildImage = new codebuild.Project(this, "BuildImage", {
      buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspec.yaml"),
      source: codebuild.Source.codeCommit({ repository: codeRepo }),
      environment: {
        privileged: true,
        environmentVariables: {
          REGION: { value: process.env.CDK_DEFAULT_REGION! },
          AWS_ACCOUNT_ID: { value: process.env.CDK_DEFAULT_ACCOUNT! },
          IMAGE_TAG: { value: "latest" },
          IMAGE_REPO_NAME: { value: imageRepo.repositoryName },
          REPOSITORY_URI: { value: imageRepo.repositoryUri },
          TASK_ROLE_ARN: { value: fargateTaskDef.taskRole.roleArn },
          EXECUTION_ROLE_ARN: { value: fargateTaskDef.executionRole?.roleArn },
          TASK_DEFINITION_ARN: { value: fargateTaskDef.taskDefinitionArn },
        },
      },
    });

    // Grants CodeBuild project access to pull/push images from/to ECR repo
    imageRepo.grantPullPush(buildImage);

    // Lambda function that triggers CodeBuild image build project
    new lambda.Function(this, "BuildLambda", {
      architecture: lambda.Architecture.ARM_64,
      code: lambda.AssetCode.fromAsset(path.join(__dirname, "../lambda"), {}),
      handler: "trigger-build.handler",
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        REGION: process.env.CDK_DEFAULT_ACCOUNT!,
        CODEBUILD_PROJECT_NAME: buildImage.projectName,
      },
    });
  }
}
