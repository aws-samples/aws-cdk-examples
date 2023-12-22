package main

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
	"github.com/aws/aws-cdk-go/awscdk/v2/awssagemaker"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

// StackProps and additional properties to be used by the stack.
type NotebookStackProps struct {
	awscdk.StackProps
	InstanceType   *string
	NotebookName   *string
	VolumeSizeInGb *float64
}

func NewNotebookStack(scope constructs.Construct, id string, props *NotebookStackProps) awscdk.Stack {
	var sprops awscdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}
	stack := awscdk.NewStack(scope, &id, &sprops)

	// Create an IAM role for the SageMaker notebook
	serviceRole := awsiam.NewRole(stack, jsii.String("SageMakerNotebookRole"),
		&awsiam.RoleProps{
			AssumedBy:   awsiam.NewServicePrincipal(jsii.String("sagemaker.amazonaws.com"), nil),
			Description: jsii.String("Role for SageMaker notebook"),
		})

	// Add permissions to assume role and write logs to CloudWatch.
	serviceRole.AddToPolicy(awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
		Actions: &[]*string{
			jsii.String("sts:AssumeRole"),
			jsii.String("logs:DescribeLogStreams"),
			jsii.String("logs:CreateLogStream"),
			jsii.String("logs:CreateLogGroup"),
			jsii.String("logs:PutLogEvents"),
		},
		Resources: &[]*string{
			jsii.String("*"),
		},
	}))

	// Define the SageMaker notebook instance with the specified parameters.
	notebook := awssagemaker.NewCfnNotebookInstance(
		stack, jsii.String("MyNotebookInstance"), &awssagemaker.CfnNotebookInstanceProps{
			InstanceType:         props.InstanceType,
			RoleArn:              serviceRole.RoleArn(),
			NotebookInstanceName: props.NotebookName,
			VolumeSizeInGb:       props.VolumeSizeInGb,
			DirectInternetAccess: jsii.String("Enabled"),
			RootAccess:           jsii.String("Disabled"),
		})

	// Add the Notebook instance name as CloudFormation output.
	awscdk.NewCfnOutput(stack, jsii.String("NotebookInstanceName"),
		&awscdk.CfnOutputProps{
			Value: notebook.NotebookInstanceName(),
		})

	return stack
}

func main() {
	defer jsii.Close()

	app := awscdk.NewApp(nil)

	// Set the notebook parameters.
	instanceType := jsii.String("ml.t3.medium")
	notebookName := jsii.String("MyNotebook")
	volumeSizeInGb := jsii.Number(5)

	props := &NotebookStackProps{
		StackProps: awscdk.StackProps{
			Env: env(),
		},
		InstanceType:   instanceType,
		NotebookName:   notebookName,
		VolumeSizeInGb: volumeSizeInGb,
	}

	// Create the stack.
	NewNotebookStack(app, "SageMakerNotebookStack", props)

	app.Synth(nil)
}

// env determines the AWS environment (account+region) in which our stack is to
// be deployed. For more information see: https://docs.aws.amazon.com/cdk/latest/guide/environments.html
func env() *awscdk.Environment {
	// If unspecified, this stack will be "environment-agnostic".
	// Account/Region-dependent features and context lookups will not work, but a
	// single synthesized template can be deployed anywhere.
	//---------------------------------------------------------------------------
	// return nil

	// Uncomment if you know exactly what account and region you want to deploy
	// the stack to. This is the recommendation for production stacks.
	//---------------------------------------------------------------------------
	// return &awscdk.Environment{
	//  Account: jsii.String("123456789012"),
	//  Region:  jsii.String("us-east-1"),
	// }
	return &awscdk.Environment{
		Region: jsii.String("us-east-1"),
	}

	// Uncomment to specialize this stack for the AWS Account and Region that are
	// implied by the current CLI configuration. This is recommended for dev
	// stacks.
	//---------------------------------------------------------------------------
	// return &awscdk.Environment{
	//  Account: jsii.String(os.Getenv("CDK_DEFAULT_ACCOUNT")),
	//  Region:  jsii.String(os.Getenv("CDK_DEFAULT_REGION")),
	// }
}
