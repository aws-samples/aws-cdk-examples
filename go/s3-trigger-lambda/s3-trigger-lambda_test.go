package main

import (
	"testing"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	assertions "github.com/aws/aws-cdk-go/awscdk/v2/assertions"
	"github.com/aws/jsii-runtime-go"
)

func TestS3TriggerLambdaStack(t *testing.T) {
	// GIVEN
	app := awscdk.NewApp(nil)

	// WHEN
	stack := NewS3TriggerLambdaStack(app, "MyStack", nil)

	// THEN
	template := assertions.Template_FromStack(stack)


	template.HasResourceProperties(jsii.String("AWS::Lambda::Function"), map[string]interface{}{
		"Timeout": 300,
		"Handler": "handler.main",
	})


	template.HasResourceProperties(jsii.String("Custom::S3BucketNotifications"), map[string]interface{}{
		"BucketName": map[string]string{"Ref": "MyS3C8F64D14"},
	})

}
