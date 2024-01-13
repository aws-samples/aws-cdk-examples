package main

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsapigatewayv2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsapigatewayv2integrations"
	"github.com/aws/aws-cdk-go/awscdk/v2/awslambda"
	"github.com/aws/aws-cdk-go/awscdklambdagoalpha/v2"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

type HttpapiLambdaStackProps struct {
	awscdk.StackProps
}

func NewHttpapiLambdaStack(scope constructs.Construct, id string, props *HttpapiLambdaStackProps) awscdk.Stack {
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

	// create HTTP API
	httpApi := awsapigatewayv2.NewHttpApi(stack, jsii.String("myHttpApi"), &awsapigatewayv2.HttpApiProps{
		ApiName: jsii.String("myHttpApi"),
	})

	// add route to HTTP API
	httpApi.AddRoutes(&awsapigatewayv2.AddRoutesOptions{
		Path:        jsii.String("/"),
		Methods:     &[]awsapigatewayv2.HttpMethod{awsapigatewayv2.HttpMethod_GET},
		Integration: awsapigatewayv2integrations.NewHttpLambdaIntegration(jsii.String("MyHttpLambdaIntegration"), getHandler, &awsapigatewayv2integrations.HttpLambdaIntegrationProps{}),
	})

	// log HTTP API endpoint
	awscdk.NewCfnOutput(stack, jsii.String("myHttpApiEndpoint"), &awscdk.CfnOutputProps{
		Value:       httpApi.ApiEndpoint(),
		Description: jsii.String("HTTP API Endpoint"),
	})

	return stack
}

func main() {
	app := awscdk.NewApp(nil)

	NewHttpapiLambdaStack(app, "HttpapiLambdaStack", &HttpapiLambdaStackProps{
		awscdk.StackProps{
			Env: env(),
		},
	})

	app.Synth(nil)
}

func env() *awscdk.Environment {
	return nil
}
