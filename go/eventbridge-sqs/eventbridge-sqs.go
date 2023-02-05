package main

import (
	"os"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsevents"
	"github.com/aws/aws-cdk-go/awscdk/v2/awseventstargets"
	"github.com/aws/aws-cdk-go/awscdk/v2/awssqs"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

type EventbridgeSqsStackProps struct {
	awscdk.StackProps
}

func NewEventbridgeSqsStack(scope constructs.Construct, id string, props *EventbridgeSqsStackProps) awscdk.Stack {
	var sprops awscdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}
	stack := awscdk.NewStack(scope, &id, &sprops)

	// create SQS queue
	queue := awssqs.NewQueue(stack, jsii.String("EventbridgeSqsQueue"), &awssqs.QueueProps{
		VisibilityTimeout: awscdk.Duration_Seconds(jsii.Number(300)),
	})

	// create EventBridge event bus
	eventBus := awsevents.NewEventBus(stack, jsii.String("MyEventBus"), &awsevents.EventBusProps{
		EventBusName: jsii.String("MyEventBus"),
	})

	// create EventBridge rule
	rule := awsevents.NewRule(stack, jsii.String("myEventBusRule"), &awsevents.RuleProps{
		Description: jsii.String("Log all events"),
		EventBus:    eventBus,
		EventPattern: &awsevents.EventPattern{
			Source:     jsii.Strings("MyCdkApp"),
			DetailType: jsii.Strings("message-for-queue"),
			Region:     jsii.Strings(*props.Env.Region),
		},
	})

	// add SQS queue as target for EventBridge rule
	rule.AddTarget(awseventstargets.NewSqsQueue(queue, &awseventstargets.SqsQueueProps{}))

	// log SQS URL
	awscdk.NewCfnOutput(stack, jsii.String("queueUrl"), &awscdk.CfnOutputProps{
		Value:       queue.QueueUrl(),
		Description: jsii.String("URL of SQS Queue"),
	})

	return stack
}

func main() {
	app := awscdk.NewApp(nil)

	NewEventbridgeSqsStack(app, "EventbridgeSqsStack", &EventbridgeSqsStackProps{
		awscdk.StackProps{
			Env: env(),
		},
	})

	app.Synth(nil)
}

func env() *awscdk.Environment {
	return &awscdk.Environment{
		Region: jsii.String(os.Getenv("AWS_DEFAULT_REGION")),
	}
}
