package main

import (
	"testing"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/assertions"
	"github.com/aws/jsii-runtime-go"
)

func TestEventbridgeSqsStack(t *testing.T) {
	// GIVEN
	app := awscdk.NewApp(nil)

	// WHEN
	stack := NewEventbridgeSqsStack(app, "MyStack", &EventbridgeSqsStackProps{
		awscdk.StackProps{
			Env: env(),
		},
	})

	// THEN
	template := assertions.Template_FromStack(stack)

	template.HasResourceProperties(jsii.String("AWS::SQS::Queue"), map[string]interface{}{
		"VisibilityTimeout": 300,
	})

	template.HasResourceProperties(jsii.String("AWS::Events::EventBus"), map[string]interface{}{})

	template.HasResourceProperties(jsii.String("AWS::Events::Rule"), map[string]interface{}{
		"EventPattern": map[string]interface{}{
			"source":      jsii.Strings("MyCdkApp"),
			"detail-type": jsii.Strings("message-for-queue"),
		},
	})
}
