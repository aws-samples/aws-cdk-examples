package main

import (
	"testing"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/assertions"
	"github.com/aws/jsii-runtime-go"
)

func TestLambdaContainerStack(t *testing.T) {
	// GIVEN
	app := awscdk.NewApp(nil)

	// WHEN
	stack := LambdaContainerStack(app, "MyStack", nil)

	// THEN
	template := assertions.Template_FromStack(stack)

	template.HasResourceProperties(jsii.String("AWS::Lambda::Function"), map[string]interface{}{
		"FunctionName": "sampleContainerFunction",
	})

	template.HasResourceProperties(jsii.String("Custom::S3BucketNotifications"), map[string]interface{}{
		"NotificationConfiguration": map[string]interface{}{
			"LambdaFunctionConfigurations": []map[string][]string{
				{
					"Events": {"s3:ObjectCreated:*"},
				},
			},
		},
	})
}
