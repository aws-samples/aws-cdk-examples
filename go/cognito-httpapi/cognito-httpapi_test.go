package main

import (
	"testing"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/assertions"
	"github.com/aws/jsii-runtime-go"
)

func TestCognitoHttpapiStack(t *testing.T) {
	// GIVEN
	app := awscdk.NewApp(nil)

	// WHEN
	stack := NewCognitoHttpapiStack(app, "MyStack", &CognitoHttpapiStackProps{
		awscdk.StackProps{
			Env: env(),
		},
	})

	// THEN
	template := assertions.Template_FromStack(stack)

	template.HasResourceProperties(jsii.String("AWS::ApiGatewayV2::Api"), map[string]interface{}{
		"ProtocolType": "HTTP",
	})

	template.HasResourceProperties(jsii.String("AWS::ApiGatewayV2::Authorizer"), map[string]interface{}{
		"AuthorizerType": "JWT",
		"IdentitySource": jsii.Strings("$request.header.Authorization"),
	})

	template.HasResourceProperties(jsii.String("AWS::Cognito::UserPoolClient"), map[string]interface{}{
		"AllowedOAuthFlows":  jsii.Strings("implicit", "code"),
		"AllowedOAuthScopes": jsii.Strings("email", "openid", "profile"),
	})
}
