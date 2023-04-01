package main

import (
	"os"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"

	codebuild "github.com/aws/aws-cdk-go/awscdk/v2/awscodebuild"
	codecommit "github.com/aws/aws-cdk-go/awscdk/v2/awscodecommit"
	codedeploy "github.com/aws/aws-cdk-go/awscdk/v2/awscodedeploy"
	pipeline "github.com/aws/aws-cdk-go/awscdk/v2/awscodepipeline"
	pipelineactions "github.com/aws/aws-cdk-go/awscdk/v2/awscodepipelineactions"
	ec2 "github.com/aws/aws-cdk-go/awscdk/v2/awsec2"
	ecr "github.com/aws/aws-cdk-go/awscdk/v2/awsecr"
	ecs "github.com/aws/aws-cdk-go/awscdk/v2/awsecs"
	elb "github.com/aws/aws-cdk-go/awscdk/v2/awselasticloadbalancingv2"
	iam "github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
	lambda "github.com/aws/aws-cdk-go/awscdk/v2/awslambda"
	custom "github.com/aws/aws-cdk-go/awscdk/v2/customresources"
)

type CodePipelineBuildDeployStackProps struct {
	awscdk.StackProps
}

func NewCodePipelineBuildDeployStack(scope constructs.Construct, id string, props *CodePipelineBuildDeployStackProps) awscdk.Stack {
	var sprops awscdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}
	stack := awscdk.NewStack(scope, &id, &sprops)

	// Creates an AWS CodeCommit repository
	codeRepo := codecommit.NewRepository(stack, jsii.String("CodeRepo"), &codecommit.RepositoryProps{
		RepositoryName: jsii.String("MyContainerizedApp"),
		// Copies files from ./app directory to the repo as the initial commit
		Code: codecommit.Code_FromDirectory((jsii.String("./app")), jsii.String("main")),
	})

	// Creates an Elastic Container Registry (ECR) image repository
	imageRepo := ecr.NewRepository(stack, jsii.String("ImageRepo"), &ecr.RepositoryProps{
		RepositoryName: jsii.String("app-image-repo"),
		RemovalPolicy:  awscdk.RemovalPolicy_DESTROY,
	})

	// Creates a Task Definition for the ECS Fargate service
	fargateTaskDef := ecs.NewFargateTaskDefinition(stack, jsii.String("FargateTaskDef"), &ecs.FargateTaskDefinitionProps{})
	fargateTaskDef.AddContainer(jsii.String("container"), &ecs.ContainerDefinitionOptions{
		ContainerName: jsii.String("web"),
		Image:         ecs.ContainerImage_FromEcrRepository(imageRepo, jsii.String("latest")),
		PortMappings: &[]*ecs.PortMapping{
			&ecs.PortMapping{
				ContainerPort: jsii.Number(80),
			},
		},
	})

	// CodeBuild project that builds the initial Docker image when the stack is created
	initialBuild := codebuild.NewProject(stack, jsii.String("InitialBuild"), &codebuild.ProjectProps{
		ProjectName: jsii.String("initialDockerBuild"),
		BuildSpec:   codebuild.BuildSpec_FromSourceFilename(jsii.String("buildspec.yaml")),
		Source: codebuild.Source_CodeCommit(&codebuild.CodeCommitSourceProps{
			Repository: codeRepo,
		}),
		Environment: &codebuild.BuildEnvironment{
			Privileged: jsii.Bool(true),
		},
		// Sets environment variables to use during the build
		EnvironmentVariables: &map[string]*codebuild.BuildEnvironmentVariable{
			"AWS_DEFAULT_REGION": &codebuild.BuildEnvironmentVariable{
				Value: jsii.String(os.Getenv("CDK_DEFAULT_REGION")),
			},
			"AWS_ACCOUNT_ID": &codebuild.BuildEnvironmentVariable{
				Value: jsii.String(os.Getenv("CDK_DEFAULT_ACCOUNT")),
			},
			"IMAGE_TAG": &codebuild.BuildEnvironmentVariable{
				Value: jsii.String("latest"),
			},
			"IMAGE_REPO_NAME": &codebuild.BuildEnvironmentVariable{
				Value: imageRepo.RepositoryName(),
			},
			"REPOSITORY_URI": &codebuild.BuildEnvironmentVariable{
				Value: imageRepo.RepositoryUri(),
			},
			"TASK_ROLE_ARN": &codebuild.BuildEnvironmentVariable{
				Value: fargateTaskDef.TaskRole().RoleArn(),
			},
			"EXECUTION_ROLE_ARN": &codebuild.BuildEnvironmentVariable{
				Value: fargateTaskDef.TaskRole().RoleArn(),
			},
			"TASK_DEFINITION_ARN": &codebuild.BuildEnvironmentVariable{
				Value: fargateTaskDef.TaskDefinitionArn(),
			},
		},
	})

	// Grants CodeBuild Project access to pull/push images from/to ECR repo
	imageRepo.GrantPullPush(initialBuild)

	// Lambda function containing logic to trigger the CodeBuild image build project
	triggerBuildLambda := lambda.NewFunction(stack, jsii.String("InitialBuildLambda"), &lambda.FunctionProps{
		FunctionName: jsii.String("initial-image-build"),
		Code:         lambda.AssetCode_FromAsset(jsii.String("./lambda/"), nil),
		Handler:      jsii.String("trigger-build.handler"),
		Runtime:      lambda.Runtime_NODEJS_18_X(),
		Architecture: lambda.Architecture_ARM_64(),
		Environment: &map[string]*string{
			"CODEBUILD_PROJECT_NAME": jsii.String(*initialBuild.ProjectName()),
		},
		InitialPolicy: &[]iam.PolicyStatement{
			iam.NewPolicyStatement(&iam.PolicyStatementProps{
				Actions: &[]*string{
					jsii.String("codebuild:StartBuild"),
				},
				Effect: iam.Effect_ALLOW,
				Resources: &[]*string{
					jsii.String(*initialBuild.ProjectArn()),
				},
			}),
		},
	})

	// Triggers a Lambda function
	custom.NewAwsCustomResource(stack, jsii.String("BuildLambdaTrigger"), &custom.AwsCustomResourceProps{
		InstallLatestAwsSdk: jsii.Bool(true),
		Policy: custom.AwsCustomResourcePolicy_FromStatements(&[]iam.PolicyStatement{
			iam.NewPolicyStatement(&iam.PolicyStatementProps{
				Actions: &[]*string{
					jsii.String("lambda:InvokeFunction"),
				},
				Effect: iam.Effect_ALLOW,
				Resources: &[]*string{
					triggerBuildLambda.FunctionArn(),
				},
			}),
		}),
		OnCreate: &custom.AwsSdkCall{
			Service:            jsii.String("Lambda"),
			Action:             jsii.String("invoke"),
			PhysicalResourceId: custom.PhysicalResourceId_Of(jsii.String("id")),
			Parameters: map[string]*string{
				"FunctionName":   triggerBuildLambda.FunctionName(),
				"InvocationType": jsii.String("Event"),
			},
		},
		OnUpdate: &custom.AwsSdkCall{
			Service: jsii.String("Lambda"),
			Action:  jsii.String("invoke"),
			Parameters: map[string]*string{
				"FunctionName":   triggerBuildLambda.FunctionName(),
				"InvocationType": jsii.String("Event"),
			},
		},
	})

	// Creates VPC for the ECS Cluster
	clusterVpc := ec2.NewVpc(stack, jsii.String("ClusterVpc"), &ec2.VpcProps{
		IpAddresses: ec2.IpAddresses_Cidr(jsii.String("10.45.0.0/16")),
		VpcName:     jsii.String("simple-app-vpc"),
	})

	// Creates a new blue Target Group
	targetGroupBlue := elb.NewApplicationTargetGroup(stack, jsii.String("BlueTargetGroup"),
		&elb.ApplicationTargetGroupProps{
			TargetGroupName: jsii.String("alb-blue-tg"),
			TargetType:      elb.TargetType_IP,
			Port:            jsii.Number(80),
			Vpc:             clusterVpc,
		},
	)

	// Creates a new green Target Group
	targetGroupGreen := elb.NewApplicationTargetGroup(stack, jsii.String("GreenTargetGroup"),
		&elb.ApplicationTargetGroupProps{
			TargetGroupName: jsii.String("alb-green-tg"),
			TargetType:      elb.TargetType_IP,
			Port:            jsii.Number(80),
			Vpc:             clusterVpc,
		},
	)

	// Creates a Security Group fro the Application Load Balancer (ALB)
	albSg := ec2.NewSecurityGroup(stack, jsii.String("SecurityGroup"), &ec2.SecurityGroupProps{
		Vpc:              clusterVpc,
		AllowAllOutbound: jsii.Bool(true),
	})
	albSg.AddIngressRule(ec2.Peer_AnyIpv4(), ec2.Port_Tcp(jsii.Number(80)), jsii.String("Allows access on port 80/http"), jsii.Bool(false))

	// Creates a public ALB
	publicAlb := elb.NewApplicationLoadBalancer(stack, jsii.String("publicAlb"), &elb.ApplicationLoadBalancerProps{
		Vpc:              clusterVpc,
		LoadBalancerName: jsii.String("public-alb"),
		InternetFacing:   jsii.Bool(true),
		SecurityGroup:    albSg,
	})

	// Adds a listener on port 80 to the ALB
	albListener := publicAlb.AddListener(jsii.String("albListener80"), &elb.BaseApplicationListenerProps{
		Port: jsii.Number(80),
		Open: jsii.Bool(false),
		DefaultTargetGroups: &[]elb.IApplicationTargetGroup{
			targetGroupBlue,
		},
	})

	// Creates an ECS Fargate service
	fargateService := ecs.NewFargateService(stack, jsii.String("FargateService"), &ecs.FargateServiceProps{
		DesiredCount:   jsii.Number(1),
		ServiceName:    jsii.String("fargate-frontend-service"),
		TaskDefinition: fargateTaskDef,
		Cluster: ecs.NewCluster(stack, jsii.String("EcsCluster"), &ecs.ClusterProps{
			ClusterName:                    jsii.String("simple-app-ecs-cluster"),
			EnableFargateCapacityProviders: jsii.Bool(true),
			Vpc:                            clusterVpc,
		}),
		DeploymentController: &ecs.DeploymentController{
			Type: ecs.DeploymentControllerType_CODE_DEPLOY,
		},
	})

	// Adds the ECS Fargate service to the ALB target group
	fargateService.AttachToApplicationTargetGroup(targetGroupBlue)

	// Creates new pipeline artifacts
	sourceArtifact := pipeline.NewArtifact(jsii.String("SourceArtifact"))
	buildArtifact := pipeline.NewArtifact(jsii.String("BuildArtifact"))

	// Creates an AWS CodePipeline with source, build, and deploy stages
	pipeline.NewPipeline(stack, jsii.String("BuildPipeline"), &pipeline.PipelineProps{
		PipelineName: jsii.String("ImageBuildPipeline"),
		Stages: &[]*pipeline.StageProps{
			&pipeline.StageProps{
				StageName: jsii.String("Source"),
				Actions: &[]pipeline.IAction{
					pipelineactions.NewCodeCommitSourceAction(&pipelineactions.CodeCommitSourceActionProps{
						ActionName: jsii.String("CodeCommit"),
						Repository: codeRepo,
						Branch:     jsii.String("main"),
						Output:     sourceArtifact,
					}),
				},
			},
			&pipeline.StageProps{
				StageName: jsii.String("Build"),
				Actions: &[]pipeline.IAction{
					pipelineactions.NewCodeBuildAction(&pipelineactions.CodeBuildActionProps{
						ActionName: jsii.String("DockerBuildPush"),
						Input:      pipeline.NewArtifact(jsii.String("SourceArtifact")),
						Outputs: &[]pipeline.Artifact{
							buildArtifact,
						},
						Project: initialBuild,
					}),
				},
			},
			&pipeline.StageProps{
				StageName: jsii.String("Deploy"),
				Actions: &[]pipeline.IAction{
					pipelineactions.NewCodeDeployEcsDeployAction(&pipelineactions.CodeDeployEcsDeployActionProps{
						ActionName:                  jsii.String("EcsFargateDeploy"),
						AppSpecTemplateInput:        buildArtifact,
						TaskDefinitionTemplateInput: buildArtifact,
						// Creates a CodeDeploy Deployment Group
						DeploymentGroup: codedeploy.NewEcsDeploymentGroup(stack, jsii.String("CodeDeployGroup"),
							&codedeploy.EcsDeploymentGroupProps{
								Service: fargateService,
								// Configurations for CodeDeploy Blue/Green deployments
								BlueGreenDeploymentConfig: &codedeploy.EcsBlueGreenDeploymentConfig{
									Listener:         albListener,
									BlueTargetGroup:  targetGroupBlue,
									GreenTargetGroup: targetGroupGreen,
								},
							},
						),
					}),
				},
			},
		},
	})

	// Outputs the ALB public endpoint
	awscdk.NewCfnOutput(stack, jsii.String("PublicAlbEndpoint"), &awscdk.CfnOutputProps{
		Value: publicAlb.LoadBalancerDnsName(),
	})

	return stack
}

func main() {
	defer jsii.Close()

	app := awscdk.NewApp(nil)

	NewCodePipelineBuildDeployStack(app, "CodePipelineBuildDeployStack", &CodePipelineBuildDeployStackProps{
		awscdk.StackProps{
			Env: env(),
		},
	})

	app.Synth(nil)
}

// env determines the AWS environment (account+region) in which our stack is to
// be deployed. For more information see: https://docs.aws.amazon.com/cdk/latest/guide/environments.html
func env() *awscdk.Environment {
	// If unspecified, this stack will be "environment-agnostic".
	// Account/Region-dependent features and context lookups will not work, but a
	// single synthesized template can be deployed anywhere.
	//---------------------------------------------------------------------------
	return nil

	// Uncomment if you know exactly what account and region you want to deploy
	// the stack to. This is the recommendation for production stacks.
	//---------------------------------------------------------------------------
	// return &awscdk.Environment{
	//  Account: jsii.String("123456789012"),
	//  Region:  jsii.String("us-east-1"),
	// }

	// Uncomment to specialize this stack for the AWS Account and Region that are
	// implied by the current CLI configuration. This is recommended for dev
	// stacks.
	//---------------------------------------------------------------------------
	// return &awscdk.Environment{
	//  Account: jsii.String(os.Getenv("CDK_DEFAULT_ACCOUNT")),
	//  Region:  jsii.String(os.Getenv("CDK_DEFAULT_REGION")),
	// }
}
