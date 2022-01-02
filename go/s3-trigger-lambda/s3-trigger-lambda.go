package main

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awslambda"
	"github.com/aws/aws-cdk-go/awscdk/v2/awss3"
	"github.com/aws/aws-cdk-go/awscdk/v2/awss3notifications"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

type S3TriggerLambdaStackProps struct {
	awscdk.StackProps
}

func NewS3TriggerLambdaStack(scope constructs.Construct, id string, props *S3TriggerLambdaStackProps) awscdk.Stack {
	var sprops awscdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}
	stack := awscdk.NewStack(scope, &id, &sprops)

	// Lambda function
	lambdaFunc := awslambda.NewFunction(stack, jsii.String("MyLambda"), &awslambda.FunctionProps{
		Code: awslambda.NewAssetCode(jsii.String("lib"), nil),
		Handler: jsii.String("handler.main"),
		Timeout: awscdk.Duration_Seconds(jsii.Number(300)),
		Runtime: awslambda.Runtime_PYTHON_3_6(),
	})


	//S3 bucket
	s3Bucket := awss3.NewBucket(stack, jsii.String("MyS3"), nil)

	//Lambda as the notification destination 
	lambdaDest := awss3notifications.NewLambdaDestination(lambdaFunc)

	//Sending S3 create events to lambda destination  
	s3Bucket.AddEventNotification(
		awss3.EventType_OBJECT_CREATED,
		lambdaDest,
	)


	return stack
}

func main() {
	app := awscdk.NewApp(nil)

	NewS3TriggerLambdaStack(app, "S3TriggerLambdaStack", &S3TriggerLambdaStackProps{
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
