package main

import (
	"testing"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/assertions"
	"github.com/aws/jsii-runtime-go"
)

func TestHttpapiLambdaStack(t *testing.T) {
	// GIVEN
	app := awscdk.NewApp(nil)

	// WHEN
	stack := NewHttpapiLambdaStack(app, "MyStack", nil)

	// THEN
	template := assertions.Template_FromStack(stack)

	template.HasResourceProperties(jsii.String("AWS::ApiGatewayV2::Api"), map[string]interface{}{})

	template.HasResourceProperties(jsii.String("AWS::Lambda::Function"), map[string]interface{}{
		"Runtime": "go1.x",
	})

	template.HasResourceProperties(jsii.String("AWS::ApiGatewayV2::Route"), map[string]interface{}{
		"RouteKey": "GET /",
	})
}
