package main

import (
	"testing"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/assertions"
	"github.com/aws/jsii-runtime-go"
)

func TestRekognitionLambdaS3TriggerStack(t *testing.T) {
	// GIVEN
	app := awscdk.NewApp(nil)

	// WHEN
	stack := NewRekognitionLambdaS3TriggerStack(app, "MyTestStack", nil)

	// THEN
	template := assertions.Template_FromStack(stack, nil)

	// Test S3 Bucket
	template.HasResourceProperties(jsii.String("AWS::S3::Bucket"), map[string]interface{}{})
	template.ResourceCountIs(jsii.String("AWS::S3::Bucket"), jsii.Number(1))

	// Test DynamoDB Table
	template.HasResourceProperties(jsii.String("AWS::DynamoDB::Table"), map[string]interface{}{
		"AttributeDefinitions": []map[string]interface{}{
			{
				"AttributeName": "image_name",
				"AttributeType": "S",
			},
		},
	})

}
