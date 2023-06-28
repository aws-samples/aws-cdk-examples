package main

import (
	"testing"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/assertions"
	"github.com/aws/jsii-runtime-go"
)

func TestAppServerlessCdkGoStack(t *testing.T) {
	// GIVEN
	app := awscdk.NewApp(nil)

	// WHEN
	stack := NewAppServerlessCdkGoStack(app, "MyStack", nil)

	// THEN
	template := assertions.Template_FromStack(stack)

	template.HasResourceProperties(jsii.String("AWS::Lambda::Function"), map[string]interface{}{
		"Runtime": "go1.x",
	})

	template.HasResourceProperties(jsii.String("AWS::ApiGateway::RestApi"), map[string]interface{}{
		"Name": "myGoApi",
	})

	template.HasResourceProperties(jsii.String("AWS::ApiGateway::Resource"), map[string]interface{}{
		"PathPart": "hello-world",
	})
}
