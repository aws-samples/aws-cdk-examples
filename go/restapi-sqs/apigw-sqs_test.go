package main

import (
	"testing"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/assertions"
	"github.com/aws/jsii-runtime-go"
)

func TestApigwSqsStack(t *testing.T) {
	// GIVEN
	app := awscdk.NewApp(nil)

	// WHEN
	stack := NewApigwSqsStack(app, "MyStack", &ApigwSqsStackProps{
		awscdk.StackProps{
			Env: env(),
		},
	})

	// THEN
	template := assertions.Template_FromStack(stack)

	template.HasResourceProperties(jsii.String("AWS::SQS::Queue"), map[string]interface{}{
		"VisibilityTimeout": 300,
	})

	template.HasResourceProperties(jsii.String("AWS::ApiGateway::RestApi"), map[string]interface{}{
		"Name": "myRestApi",
	})

	template.HasResourceProperties(jsii.String("AWS::ApiGateway::Resource"), map[string]interface{}{
		"PathPart": "test",
	})
}
