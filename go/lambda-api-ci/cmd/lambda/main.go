package main

import (
	"github.com/aws-samples/aws-cdk-examples/go/lambda-api-ci/cmd/internal/constants"
	"github.com/aws-samples/aws-cdk-examples/go/lambda-api-ci/lib/lambdaapistack"
	"github.com/aws/aws-cdk-go/awscdk"
	"github.com/aws/jsii-runtime-go"
)

func main() {
	defer jsii.Close()

	app := awscdk.NewApp(nil)
	lambdaapistack.NewCDKExampleLambdaApiStack(app, jsii.String(constants.LambdaApiStackName), &lambdaapistack.CDKExampleLambdaApiStackProps{
		FunctionName: jsii.String(constants.LambdaFunctionName),
	})

	app.Synth(nil)
}
