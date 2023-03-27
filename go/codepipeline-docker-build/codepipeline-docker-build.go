package main

import (
	"fmt"
	"os"
	"path"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	codebuild "github.com/aws/aws-cdk-go/awscdk/v2/awscodebuild"
	codecommit "github.com/aws/aws-cdk-go/awscdk/v2/awscodecommit"
	pipeline "github.com/aws/aws-cdk-go/awscdk/v2/awscodepipeline"
	pipelineactions "github.com/aws/aws-cdk-go/awscdk/v2/awscodepipelineactions"
	ecr "github.com/aws/aws-cdk-go/awscdk/v2/awsecr"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

type CodepipelineDockerBuildStackProps struct {
	awscdk.StackProps
}

func NewCodepipelineDockerBuildStack(scope constructs.Construct, id string, props *CodepipelineDockerBuildStackProps) awscdk.Stack {
	var sprops awscdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}
	stack := awscdk.NewStack(scope, &id, &sprops)

	// The code that defines your stack goes here

	// Gets path to current directory
	dir, err := os.Getwd()
	if err != nil {
		fmt.Println(err)
	}

	// Creates an AWS CodeCommit repository
	codeRepo := codecommit.NewRepository(stack, jsii.String("CodeRepo"), &codecommit.RepositoryProps{
		RepositoryName: jsii.String("MyContainerizedApp"),
		// Copies files from ./app directory to the repo as the initial commit
		Code: codecommit.Code_FromDirectory((jsii.String(path.Join(dir, "app/"))), jsii.String("main")),
	})

	// Creates an Amazon Elastic Container Registry (ECR) image repository
	imageRepo := ecr.NewRepository(stack, jsii.String("ImageRepo"), &ecr.RepositoryProps{
		RepositoryName:  jsii.String("simple-app-image-repo"),
		ImageScanOnPush: jsii.Bool(true),
	})

	// Creates an AWS CodeBuild project
	codeBuildProject := codebuild.NewPipelineProject(stack, jsii.String("BuildProject"), &codebuild.PipelineProjectProps{
		ProjectName: jsii.String("DockerBuildProject"),
		BuildSpec:   codebuild.BuildSpec_FromSourceFilename(jsii.String("buildspec.yml")),
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
		},
	})

	// Grants CodeBuild project access to pull/push image from/to ECR repo
	imageRepo.GrantPullPush(codeBuildProject)

	// Creates an AWS CodePipeline with source and build stages
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
						Output:     pipeline.NewArtifact(jsii.String("SourceArtifact")),
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
							pipeline.NewArtifact(jsii.String("BuildArtifact")),
						},
						Project: codeBuildProject,
					}),
				},
			},
		},
	})

	return stack
}

func main() {
	defer jsii.Close()

	app := awscdk.NewApp(nil)

	NewCodepipelineDockerBuildStack(app, "CodepipelineDockerBuildStack", &CodepipelineDockerBuildStackProps{
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
