package main

import (
	"testing"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/assertions"
	"github.com/aws/jsii-runtime-go"
)

func TestS3EventProcessorStack(t *testing.T) {
	app := awscdk.NewApp(nil)
	stack := NewS3EventProcessorStack(app, "TestStack", nil)
	template := assertions.Template_FromStack(stack, nil)

	template.HasResourceProperties(
		jsii.String("AWS::S3::Bucket"),
		map[string]interface{}{
			"BucketEncryption": map[string]interface{}{
				"ServerSideEncryptionConfiguration": []map[string]interface{}{
					{
						"ServerSideEncryptionByDefault": map[string]interface{}{
							"SSEAlgorithm": "AES256",
						},
					},
				},
			},
			"PublicAccessBlockConfiguration": map[string]interface{}{
				"BlockPublicAcls":       true,
				"BlockPublicPolicy":     true,
				"IgnorePublicAcls":      true,
				"RestrictPublicBuckets": true,
			},
			"VersioningConfiguration": map[string]interface{}{
				"Status": "Enabled",
			},
		},
	)

	template.HasResourceProperties(
		jsii.String("AWS::SNS::Topic"),
		map[string]interface{}{
			"TopicName": "s3-object-created-topic",
		},
	)

	template.HasResourceProperties(
		jsii.String("AWS::SQS::Queue"),
		map[string]interface{}{
			"QueueName":            "s3-object-created-queue",
			"SqsManagedSseEnabled": true,
		},
	)

	template.HasResourceProperties(
		jsii.String("AWS::SQS::Queue"),
		map[string]interface{}{
			"QueueName":            "s3-object-created-dl-queue",
			"SqsManagedSseEnabled": true,
		},
	)

	template.HasResourceProperties(
		jsii.String("AWS::Lambda::Function"),
		map[string]interface{}{
			"FunctionName": "s3-object-created-handler",
		},
	)

	template.ResourceCountIs(
		jsii.String("AWS::Lambda::Alias"),
		jsii.Number(1),
	)

	template.ResourceCountIs(
		jsii.String("AWS::SNS::Subscription"),
		jsii.Number(1),
	)

	template.ResourceCountIs(
		jsii.String("Custom::S3BucketNotifications"),
		jsii.Number(1),
	)
}
