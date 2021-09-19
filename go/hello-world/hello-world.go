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

// If the stack required additional properties, they should be defined here
// By default, this is simply the default stack properties
type HelloWorldStackProps struct {
	awscdk.StackProps
}

func NewHelloWorldStack(scope constructs.Construct, id string, props *HelloWorldStackProps) awscdk.Stack {
	var sprops awscdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}

	stack := awscdk.NewStack(scope, &id, &sprops)

	// Define an S3 construct. Some of the properties are default values, but they're listed here for completeness
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
