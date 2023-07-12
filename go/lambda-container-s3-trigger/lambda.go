package main

import (
	"os"
	"path/filepath"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awslambda"
	"github.com/aws/aws-cdk-go/awscdk/v2/awss3"
	"github.com/aws/aws-cdk-go/awscdk/v2/awss3notifications"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

type LambdaContainerStackProps struct {
	awscdk.StackProps
}

func LambdaContainerStack(scope constructs.Construct, id string, props *LambdaContainerStackProps) awscdk.Stack {
	var sprops awscdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}
	stack := awscdk.NewStack(scope, &id, &sprops)

	// Create new container image

	dir, _ := os.Getwd()

	ecr_image := awslambda.EcrImageCode_FromAssetImage(jsii.String(filepath.Join(dir, "lambda-image")),
		&awslambda.AssetImageCodeProps{},
	)

	// Create Lambda function

	fn := awslambda.NewFunction(stack, jsii.String("lambdaFromContainer"), &awslambda.FunctionProps{
		Code: ecr_image,
		// Handler and Runtime must be *FROM_IMAGE* when provisioning Lambda from container.
		Handler:      awslambda.Handler_FROM_IMAGE(),
		Runtime:      awslambda.Runtime_FROM_IMAGE(),
		FunctionName: jsii.String("sampleContainerFunction"),
		Timeout:      awscdk.Duration_Seconds(jsii.Number(3)),
	})

	// Create s3 bucket and event notification.

	s3 := awss3.NewBucket(stack, jsii.String("s3bucket"), &awss3.BucketProps{})

	notification := awss3notifications.NewLambdaDestination(fn)

	s3.AddEventNotification(awss3.EventType_OBJECT_CREATED, notification)

	// log lambda function ARN
	awscdk.NewCfnOutput(stack, jsii.String("lambdaFunctionArn"), &awscdk.CfnOutputProps{
		Value:       fn.FunctionArn(),
		Description: jsii.String("Lambda function ARN"),
	})

	// log s3 bucket ARN
	awscdk.NewCfnOutput(stack, jsii.String("s3BucketArn"), &awscdk.CfnOutputProps{
		Value:       s3.BucketArn(),
		Description: jsii.String("s3 bucket ARN"),
	})

	return stack
}

func main() {
	app := awscdk.NewApp(nil)

	LambdaContainerStack(app, "LambdaContainerStack", &LambdaContainerStackProps{
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
