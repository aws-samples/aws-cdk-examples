package lambdaapistack

import (
	"fmt"

	"github.com/aws/aws-cdk-go/awscdk"
	"github.com/aws/aws-cdk-go/awscdk/awsapigateway"
	"github.com/aws/aws-cdk-go/awscdk/awsiam"
	"github.com/aws/aws-cdk-go/awscdk/awslambda"
	"github.com/aws/aws-cdk-go/awscdk/awss3"
	"github.com/aws/jsii-runtime-go"
)

type CDKExampleLambdaApiStack awscdk.Stack

type CDKExampleLambdaApiStackProps struct {
	awscdk.StackProps
	FunctionName *string
}

func NewCDKExampleLambdaApiStack(scope awscdk.Construct, id *string, props *CDKExampleLambdaApiStackProps) CDKExampleLambdaApiStack {
	stack := awscdk.NewStack(scope, id, &props.StackProps)

	bucket := awss3.NewBucket(stack, jsii.String("WidgetStore"), nil)

	restApi := awsapigateway.NewRestApi(stack, jsii.String(fmt.Sprintf("%sRestApi", *stack.StackName())), &awsapigateway.RestApiProps{
		DeployOptions: &awsapigateway.StageOptions{
			StageName:        jsii.String("beta"),
			MetricsEnabled:   jsii.Bool(true),
			LoggingLevel:     awsapigateway.MethodLoggingLevel_INFO,
			DataTraceEnabled: jsii.Bool(true),
		},
	})

	lambdaPolicy := awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
		Actions:   &[]*string{jsii.String("s3:ListBucket")},
		Resources: &[]*string{bucket.BucketArn()},
	})

	lambdaFunction := awslambda.NewFunction(stack, props.FunctionName, &awslambda.FunctionProps{
		FunctionName: props.FunctionName,
		Handler:      jsii.String("handler.handler"),
		Runtime:      awslambda.Runtime_NODEJS_14_X(),
		Code:         awslambda.NewAssetCode(jsii.String("./src"), nil),
		MemorySize:   jsii.Number(512),
		Timeout:      awscdk.Duration_Seconds(jsii.Number(10)),
		Environment: &map[string]*string{
			"BUCKET": bucket.BucketName(),
		},
		InitialPolicy: &[]awsiam.PolicyStatement{lambdaPolicy},
	})

	restApi.Root().AddMethod(jsii.String("GET"), awsapigateway.NewLambdaIntegration(lambdaFunction, nil), nil)

	return stack
}
