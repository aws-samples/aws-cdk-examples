package main

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awslambda"
	"github.com/aws/aws-cdk-go/awscdk/v2/awslambdaeventsources"
	"github.com/aws/aws-cdk-go/awscdk/v2/awssqs"
	"github.com/aws/aws-cdk-go/awscdklambdagoalpha/v2"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

type SqsLambdaStackProps struct {
	awscdk.StackProps
}

func NewSqsLambdaStack(scope constructs.Construct, id string, props *SqsLambdaStackProps) awscdk.Stack {
	var sprops awscdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}
	stack := awscdk.NewStack(scope, &id, &sprops)

	// create SQS queue
	queue := awssqs.NewQueue(stack, jsii.String("EventbridgeSqsQueue"), &awssqs.QueueProps{
		VisibilityTimeout: awscdk.Duration_Seconds(jsii.Number(300)),
		QueueName:         jsii.String("MySqsQueue"),
	})

	// create Lambda function
	awscdklambdagoalpha.NewGoFunction(stack, jsii.String("myGoHandler"), &awscdklambdagoalpha.GoFunctionProps{
		Runtime: awslambda.Runtime_GO_1_X(),
		Entry:   jsii.String("./sqs-consumer-handler"),
		Events: &[]awslambda.IEventSource{
			awslambdaeventsources.NewSqsEventSource(queue, &awslambdaeventsources.SqsEventSourceProps{
				BatchSize: jsii.Number(10.0),
			}),
		},
		Bundling: &awscdklambdagoalpha.BundlingOptions{
			GoBuildFlags: jsii.Strings(`-ldflags "-s -w"`),
		},
	})

	// log SQS endpoint URL
	awscdk.NewCfnOutput(stack, jsii.String("sqsUrl"), &awscdk.CfnOutputProps{
		Description: jsii.String("SQS endpoint URL"),
		Value:       queue.QueueArn(),
	})

	return stack
}

func main() {
	app := awscdk.NewApp(nil)

	NewSqsLambdaStack(app, "SqsLambdaStack", &SqsLambdaStackProps{
		awscdk.StackProps{
			Env: env(),
		},
	})

	app.Synth(nil)
}

func env() *awscdk.Environment {
	return nil
}
