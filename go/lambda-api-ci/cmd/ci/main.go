package main

import (
	"github.com/aws-samples/aws-cdk-examples/go/lambda-api-ci/cmd/internal/constants"
	"github.com/aws-samples/aws-cdk-examples/go/lambda-api-ci/lib/cistack"
	"github.com/aws/aws-cdk-go/awscdk"
	"github.com/aws/jsii-runtime-go"
)

func main() {
	defer jsii.Close()

	app := awscdk.NewApp(nil)
	cistack.NewCIStack(app, "CDKExampleLambdaApiCIStack", cistack.CIStackProps{
		RepositoryName:     jsii.String("lambda-api-ci"), // <- Replace me
		LambdaApiStackName: jsii.String(constants.LambdaApiStackName),
		LambdaFunctionName: jsii.String(constants.LambdaFunctionName),
	})

	app.Synth(nil)
}
