package main

import (
	"testing"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/assertions"
	"github.com/aws/jsii-runtime-go"
)

func TestHttpApiEventbridgeStack(t *testing.T) {
	// GIVEN
	app := awscdk.NewApp(nil)

	// WHEN
	stack := NewHttpApiEventbridgeStack(app, "MyStack", &HttpApiEventbridgeStackProps{
		awscdk.StackProps{
			Env: env(),
		},
	})

	// THEN
	template := assertions.Template_FromStack(stack)

	template.HasResourceProperties(jsii.String("AWS::Events::EventBus"), map[string]interface{}{})

	template.HasResourceProperties(jsii.String("AWS::Events::Rule"), map[string]interface{}{})

	template.HasResource(jsii.String("AWS::ApiGatewayV2::Api"), map[string]interface{}{})

	template.HasResourceProperties(jsii.String("AWS::IAM::Role"), map[string]interface{}{
		"AssumeRolePolicyDocument": map[string]interface{}{
			"Statement": []map[string]interface{}{
				{
					"Action": "sts:AssumeRole",
					"Effect": "Allow",
					"Principal": map[string]interface{}{
						"Service": "apigateway.amazonaws.com",
					},
				},
			},
		},
	})

	template.HasResourceProperties(jsii.String("AWS::ApiGatewayV2::Integration"), map[string]interface{}{
		"IntegrationType":    "AWS_PROXY",
		"IntegrationSubtype": "EventBridge-PutEvents",
		"RequestParameters": map[string]interface{}{
			"Source":     "WebApp",
			"DetailType": "MyDetailType",
			"Detail":     "$request.body",
		},
	})
}
