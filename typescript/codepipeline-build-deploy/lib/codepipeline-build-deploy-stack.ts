import * as cdk from "aws-cdk-lib";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as codecommit from "aws-cdk-lib/aws-codecommit";
import * as codedeploy from "aws-cdk-lib/aws-codedeploy";
import * as pipeline from "aws-cdk-lib/aws-codepipeline";
import * as pipelineactions from "aws-cdk-lib/aws-codepipeline-actions";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elb from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as custom from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import * as path from "path";
import * as fs from 'fs';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { IgnoreMode } from 'aws-cdk-lib';
import { Code } from 'aws-cdk-lib/aws-codecommit';

export class CodepipelineBuildDeployStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // modify gitignore file to remove unneeded files from the codecommit copy    
    let gitignore = fs.readFileSync('.gitignore').toString().split(/\r?\n/);
    gitignore.push('.git/');
    gitignore = gitignore.filter(g => g != 'node_modules/');
    gitignore.push('/node_modules/');
    
    const codeAsset = new Asset(this, 'SourceAsset', {
      path: path.join(__dirname, "../"),
      ignoreMode: IgnoreMode.GIT,
      exclude: gitignore,
    });
    
    const codeRepo = new codecommit.Repository(this, "repo", {
      repositoryName: "simple-code-repo",
      // Copies files from codepipeline-build-deploy directory to the repo as the initial commit
      code: Code.fromAsset(codeAsset, 'main'),
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
      buildSpec: codebuild.BuildSpec.fromSourceFilename("app/buildspec.yaml"),
      source: codebuild.Source.codeCommit({ repository: codeRepo }),
      environment: {
        privileged: true,
        environmentVariables: {
          AWS_ACCOUNT_ID: { value: process.env?.CDK_DEFAULT_ACCOUNT || "" },
          REGION: { value: process.env?.CDK_DEFAULT_REGION || "" },
          IMAGE_TAG: { value: "latest" },
          IMAGE_REPO_NAME: { value: imageRepo.repositoryName },
          REPOSITORY_URI: { value: imageRepo.repositoryUri },
          TASK_DEFINITION_ARN: { value: fargateTaskDef.taskDefinitionArn },
          TASK_ROLE_ARN: { value: fargateTaskDef.taskRole.roleArn },
          EXECUTION_ROLE_ARN: { value: fargateTaskDef.executionRole?.roleArn },
        },
      },
    });
    
    // CodeBuild project that builds the Docker image
    const buildTest = new codebuild.Project(this, "BuildTest", {
      buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspec.yaml"),
      source: codebuild.Source.codeCommit({ repository: codeRepo }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_4,  
      }
    });

    // Grants CodeBuild project access to pull/push images from/to ECR repo
    imageRepo.grantPullPush(buildImage);

    // Lambda function that triggers CodeBuild image build project
    const triggerCodeBuild = new lambda.Function(this, "BuildLambda", {
      architecture: lambda.Architecture.ARM_64,
      code: lambda.Code.fromAsset("./lambda"),
      handler: "trigger-build.handler",
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        REGION: process.env.CDK_DEFAULT_REGION!,
        CODEBUILD_PROJECT_NAME: buildImage.projectName,
      },
      // Allows this Lambda function to trigger the buildImage CodeBuild project
      initialPolicy: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["codebuild:StartBuild"],
          resources: [buildImage.projectArn],
        }),
      ],
    });

    // Triggers a Lambda function using AWS SDK
    const triggerLambda = new custom.AwsCustomResource(
      this,
      "BuildLambdaTrigger",
      {
        installLatestAwsSdk: true,
        policy: custom.AwsCustomResourcePolicy.fromStatements([
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["lambda:InvokeFunction"],
            resources: [triggerCodeBuild.functionArn],
          }),
        ]),
        onCreate: {
          service: "Lambda",
          action: "invoke",
          physicalResourceId: custom.PhysicalResourceId.of("id"),
          parameters: {
            FunctionName: triggerCodeBuild.functionName,
            InvocationType: "Event",
          },
        },
        onUpdate: {
          service: "Lambda",
          action: "invoke",
          parameters: {
            FunctionName: triggerCodeBuild.functionName,
            InvocationType: "Event",
          },
        },
      }
    );

    // Creates VPC for the ECS Cluster
    const clusterVpc = new ec2.Vpc(this, "ClusterVpc", {
      ipAddresses: ec2.IpAddresses.cidr("10.50.0.0/16"),
    });

    // Deploys the cluster VPC after the initial image build triggers
    clusterVpc.node.addDependency(triggerLambda);

    // Creates a new blue Target Group that routes traffic from the public Application Load Balancer (ALB) to the
    // registered targets within the Target Group e.g. (EC2 instances, IP addresses, Lambda functions)
    // https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
    const targetGroupBlue = new elb.ApplicationTargetGroup(
      this,
      "BlueTargetGroup",
      {
        targetGroupName: "alb-blue-tg",
        targetType: elb.TargetType.IP,
        port: 80,
        vpc: clusterVpc,
      }
    );

    // Creates a new green Target Group
    const targetGroupGreen = new elb.ApplicationTargetGroup(
      this,
      "GreenTargetGroup",
      {
        targetGroupName: "alb-green-tg",
        targetType: elb.TargetType.IP,
        port: 80,
        vpc: clusterVpc,
      }
    );

    // Creates a Security Group for the Application Load Balancer (ALB)
    const albSg = new ec2.SecurityGroup(this, "SecurityGroup", {
      vpc: clusterVpc,
      allowAllOutbound: true,
    });
    albSg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      "Allows access on port 80/http",
      false
    );

    // Creates a public ALB
    const publicAlb = new elb.ApplicationLoadBalancer(this, "PublicAlb", {
      vpc: clusterVpc,
      internetFacing: true,
      securityGroup: albSg,
    });

    // Adds a listener on port 80 to the ALB
    const albListener = publicAlb.addListener("AlbListener80", {
      open: false,
      port: 80,
      defaultTargetGroups: [targetGroupBlue],
    });

    // Creates an ECS Fargate service
    const fargateService = new ecs.FargateService(this, "FargateService", {
      desiredCount: 1,
      serviceName: "fargate-frontend-service",
      taskDefinition: fargateTaskDef,
      cluster: new ecs.Cluster(this, "EcsCluster", {
        enableFargateCapacityProviders: true,
        vpc: clusterVpc,
      }),
      // Sets CodeDeploy as the deployment controller
      deploymentController: {
        type: ecs.DeploymentControllerType.CODE_DEPLOY,
      },
    });

    // Adds the ECS Fargate service to the ALB target group
    fargateService.attachToApplicationTargetGroup(targetGroupBlue);

    // Creates new pipeline artifacts
    const sourceArtifact = new pipeline.Artifact("SourceArtifact");
    const buildArtifact = new pipeline.Artifact("BuildArtifact");

    // Creates the source stage for CodePipeline
    const sourceStage = {
      stageName: "Source",
      actions: [
        new pipelineactions.CodeCommitSourceAction({
          actionName: "AppCodeCommit",
          branch: "main",
          output: sourceArtifact,
          repository: codeRepo,
        }),
      ],
    };

    // Run jest test and send result to CodeBuild    
    const testStage = {
      stageName: "Test",
      actions: [
        new pipelineactions.CodeBuildAction({
          actionName: "JestCDK",
          input: new pipeline.Artifact("SourceArtifact"),
          project: buildTest,
        }),
      ],
    };

    // Creates the build stage for CodePipeline
    const buildStage = {
      stageName: "Build",
      actions: [
        new pipelineactions.CodeBuildAction({
          actionName: "DockerBuildPush",
          input: new pipeline.Artifact("SourceArtifact"),
          project: buildImage,
          outputs: [buildArtifact],
        }),
      ],
    };

    // Creates a new CodeDeploy Deployment Group
    const deploymentGroup = new codedeploy.EcsDeploymentGroup(
      this,
      "CodeDeployGroup",
      {
        service: fargateService,
        // Configurations for CodeDeploy Blue/Green deployments
        blueGreenDeploymentConfig: {
          listener: albListener,
          blueTargetGroup: targetGroupBlue,
          greenTargetGroup: targetGroupGreen,
        },
      }
    );

    // Creates the deploy stage for CodePipeline
    const deployStage = {
      stageName: "Deploy",
      actions: [
        new pipelineactions.CodeDeployEcsDeployAction({
          actionName: "EcsFargateDeploy",
          appSpecTemplateInput: buildArtifact,
          taskDefinitionTemplateInput: buildArtifact,
          deploymentGroup: deploymentGroup,
        }),
      ],
    };

    // Creates an AWS CodePipeline with source, build, and deploy stages
    new pipeline.Pipeline(this, "BuildDeployPipeline", {
      pipelineName: "ImageBuildDeployPipeline",
      stages: [sourceStage, testStage, buildStage, deployStage],
    });

    // Outputs the ALB public endpoint
    new cdk.CfnOutput(this, "PublicAlbEndpoint", {
      value: "http://" + publicAlb.loadBalancerDnsName,
    });
  }
}
