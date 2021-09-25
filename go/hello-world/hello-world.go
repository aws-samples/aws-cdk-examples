package main

import (
	"os"

	"github.com/aws/aws-cdk-go/awscdk"
	"github.com/aws/aws-cdk-go/awscdk/awss3"
	"github.com/aws/aws-cdk-go/awscdk/awss3assets"
	"github.com/aws/aws-cdk-go/awscdk/awss3deployment"
	"github.com/aws/constructs-go/constructs/v3"
	"github.com/aws/jsii-runtime-go"
)

// If the stack requires additional properties, they should be defined here
type HelloWorldStackProps struct {
	awscdk.StackProps
}

// The main entry point to the stack
func NewHelloWorldStack(scope constructs.Construct, id string, props *HelloWorldStackProps) awscdk.Stack {
	var sprops awscdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}

	stack := awscdk.NewStack(scope, &id, &sprops)

	// Define an S3 construct. Some of the properties are default values, but they're listed here for demonstration purposes
	awsS3 := awss3.NewBucket(stack, jsii.String("MyS3"), &awss3.BucketProps{
		Versioned:         jsii.Bool(false),
		AutoDeleteObjects: jsii.Bool(false),
		BlockPublicAccess: awss3.BlockPublicAccess_BLOCK_ALL(),
		BucketName:        jsii.String("my-happy-bucket-name"),
		Encryption:        awss3.BucketEncryption_S3_MANAGED,
		RemovalPolicy:     awscdk.RemovalPolicy_RETAIN,
	})

	// Specify that the file "files/hello_world.txt" should be added to the new Bucket
	curPath, _ := os.Getwd()
	filesPath := curPath + string(os.PathSeparator) + "files"

	hwAssets := make([]awss3deployment.ISource, 1)
	hwAssets[0] = awss3deployment.Source_Asset(&filesPath, &awss3assets.AssetOptions{
		Exclude: jsii.Strings("**", "!hello_world.txt"),
	})

	awss3deployment.NewBucketDeployment(stack, jsii.String("MyHelloWorldFile"), &awss3deployment.BucketDeploymentProps{
		DestinationBucket: awsS3,
		Sources:           &hwAssets,
	})

	return stack
}

func main() {
	app := awscdk.NewApp(nil)

	NewHelloWorldStack(app, "HelloWorldStack", &HelloWorldStackProps{
		awscdk.StackProps{
			Env: env(),
		},
	})

	app.Synth(nil)
}

// env determines the AWS environment (account+region) in which our stack is to
// be deployed. For more information see: https://docs.aws.amazon.com/cdk/latest/guide/environments.html
func env() *awscdk.Environment {

	// If unspecified, this stack will be "environment-agnostic"
	// If the stack is environment-agnostic, then environment-specific details must be provided at synth time

	// One of the simpler ways to do this is via the AWS CLI profile. An example command:
	// cdk deploy --profile $AWS_PROFILE

	return nil
}
