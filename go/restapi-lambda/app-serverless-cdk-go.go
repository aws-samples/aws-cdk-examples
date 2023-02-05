package main

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsapigateway"
	"github.com/aws/aws-cdk-go/awscdk/v2/awslambda"
	"github.com/aws/aws-cdk-go/awscdklambdagoalpha/v2"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

type AppServerlessCdkGoStackProps struct {
	awscdk.StackProps
}

func NewAppServerlessCdkGoStack(scope constructs.Construct, id string, props *AppServerlessCdkGoStackProps) awscdk.Stack {
	var sprops awscdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}
	stack := awscdk.NewStack(scope, &id, &sprops)

	// create Lambda function
	getHandler := awscdklambdagoalpha.NewGoFunction(stack, jsii.String("myGoHandler"), &awscdklambdagoalpha.GoFunctionProps{
		Runtime: awslambda.Runtime_GO_1_X(),
		Entry:   jsii.String("./lambda-handler"),
		Bundling: &awscdklambdagoalpha.BundlingOptions{
			GoBuildFlags: jsii.Strings(`-ldflags "-s -w"`),
		},
	})

	// create API Gateway
	restApi := awsapigateway.NewRestApi(stack, jsii.String("myGoApi"), &awsapigateway.RestApiProps{
		RestApiName:    jsii.String("myGoApi"),
		CloudWatchRole: jsii.Bool(false),
	})

	// create API Gateway resource
	restApi.Root().AddResource(jsii.String("hello-world"), &awsapigateway.ResourceOptions{}).AddMethod(
		jsii.String("GET"),
		awsapigateway.NewLambdaIntegration(getHandler, &awsapigateway.LambdaIntegrationOptions{}),
		restApi.Root().DefaultMethodOptions(),
	)

	return stack
}

func main() {
	app := awscdk.NewApp(nil)

	NewAppServerlessCdkGoStack(app, "AppServerlessCdkGoStack", &AppServerlessCdkGoStackProps{
		awscdk.StackProps{
			Env: env(),
		},
	})

	app.Synth(nil)
}

func env() *awscdk.Environment {
	return nil
}
