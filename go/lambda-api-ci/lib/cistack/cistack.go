package cistack

import (
	"fmt"

	"github.com/aws/aws-cdk-go/awscdk"
	"github.com/aws/aws-cdk-go/awscdk/awscodebuild"
	"github.com/aws/aws-cdk-go/awscdk/awscodecommit"
	"github.com/aws/aws-cdk-go/awscdk/awscodepipeline"
	"github.com/aws/aws-cdk-go/awscdk/awscodepipelineactions"
	"github.com/aws/aws-cdk-go/awscdk/awsiam"
	"github.com/aws/jsii-runtime-go"
)

type CIStack awscdk.Stack

type CIStackProps struct {
	awscdk.StackProps
	RepositoryName     *string
	LambdaApiStackName *string
	LambdaFunctionName *string
}

func NewCIStack(scope awscdk.Construct, id string, props CIStackProps) CIStack {
	stack := awscdk.NewStack(scope, &id, &props.StackProps)

	pipeline := awscodepipeline.NewPipeline(stack, jsii.String("Pipeline"), nil)

	repo := awscodecommit.Repository_FromRepositoryName(stack, jsii.String("WidgetsServiceRepository"), props.RepositoryName)
	sourceOutput := awscodepipeline.NewArtifact(jsii.String("SourceOutput"))
	sourceAction := awscodepipelineactions.NewCodeCommitSourceAction(&awscodepipelineactions.CodeCommitSourceActionProps{
		ActionName: jsii.String("CodeCommit"),
		Repository: repo,
		Output:     sourceOutput,
	})
	pipeline.AddStage(&awscodepipeline.StageOptions{
		StageName: jsii.String("Source"),
		Actions:   &[]awscodepipeline.IAction{sourceAction},
	})

	createBuildStage(stack, props, pipeline, sourceOutput)

	return stack
}

func createBuildStage(
	stack CIStack,
	props CIStackProps,
	pipeline awscodepipeline.Pipeline,
	sourceOutput awscodepipeline.Artifact,
) awscodepipeline.Artifact {
	project := awscodebuild.NewPipelineProject(stack, jsii.String("BuildProject"), &awscodebuild.PipelineProjectProps{
		Environment: &awscodebuild.BuildEnvironment{
			BuildImage: awscodebuild.LinuxBuildImage_STANDARD_3_0(),
		},
	})

	cdkDeployPolicy := awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
		Actions: &[]*string{
			jsii.String("cloudformation:GetTemplate"),
			jsii.String("cloudformation:CreateChangeSet"),
			jsii.String("cloudformation:DescribeChangeSet"),
			jsii.String("cloudformation:ExecuteChangeSet"),
			jsii.String("cloudformation:DescribeStackEvents"),
			jsii.String("cloudformation:DeleteChangeSet"),
			jsii.String("cloudformation:DescribeStacks"),
			jsii.String("s3:*Object"),
			jsii.String("s3:ListBucket"),
			jsii.String("s3:getBucketLocation"),
			jsii.String("lambda:UpdateFunctionCode"),
			jsii.String("lambda:GetFunction"),
			jsii.String("lambda:CreateFunction"),
			jsii.String("lambda:DeleteFunction"),
			jsii.String("lambda:GetFunctionConfiguration"),
			jsii.String("lambda:AddPermission"),
			jsii.String("lambda:RemovePermission"),
		},
		Resources: &[]*string{
			stack.FormatArn(&awscdk.ArnComponents{
				Service:      jsii.String("cloudformation"),
				Resource:     jsii.String("stack"),
				ResourceName: jsii.String("CDKToolkit/*"),
			}),
			stack.FormatArn(&awscdk.ArnComponents{
				Service:      jsii.String("cloudformation"),
				Resource:     jsii.String("stack"),
				ResourceName: jsii.String(fmt.Sprintf("%s/*", *props.LambdaApiStackName)),
			}),
			stack.FormatArn(&awscdk.ArnComponents{
				Service:      jsii.String("lambda"),
				Resource:     jsii.String("function"),
				Sep:          jsii.String(":"),
				ResourceName: props.LambdaFunctionName,
			}),
			jsii.String("arn:aws:s3:::cdktoolkit-stagingbucket-*"),
		},
	})

	editOrCreateLambdaDependencies := awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
		Actions: &[]*string{
			jsii.String("iam:GetRole"),
			jsii.String("iam:PassRole"),
			jsii.String("iam:CreateRole"),
			jsii.String("iam:AttachRolePolicy"),
			jsii.String("iam:PutRolePolicy"),
			jsii.String("apigateway:GET"),
			jsii.String("apigateway:DELETE"),
			jsii.String("apigateway:PUT"),
			jsii.String("apigateway:POST"),
			jsii.String("apigateway:PATCH"),
			jsii.String("s3:CreateBucket"),
			jsii.String("s3:PutBucketTagging"),
		},
		Resources: &[]*string{jsii.String("*")},
	})

	project.AddToRolePolicy(cdkDeployPolicy)
	project.AddToRolePolicy(editOrCreateLambdaDependencies)

	buildOutput := awscodepipeline.NewArtifact(jsii.String("BuildOutput"))
	buildAction := awscodepipelineactions.NewCodeBuildAction(&awscodepipelineactions.CodeBuildActionProps{
		ActionName: jsii.String("Build"),
		Project:    project,
		Input:      sourceOutput,
		Outputs:    &[]awscodepipeline.Artifact{buildOutput},
	})

	pipeline.AddStage(&awscodepipeline.StageOptions{
		StageName: jsii.String("build"),
		Actions:   &[]awscodepipeline.IAction{buildAction},
	})

	return buildOutput
}
