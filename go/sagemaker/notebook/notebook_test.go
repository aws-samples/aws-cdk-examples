package main

import (
	"testing"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/assertions"
	"github.com/aws/jsii-runtime-go"
)

func TestNotebookStack(t *testing.T) {
	// GIVEN
	app := awscdk.NewApp(nil)

	notebookName := jsii.String("MyNotebook")
	instanceType := jsii.String("ml.t3.medium")
	volumeSizeInGb := jsii.Number(5)

	props := &NotebookStackProps{
		StackProps: awscdk.StackProps{
			Env: env(),
		},
		NotebookName:   notebookName,
		InstanceType:   instanceType,
		VolumeSizeInGb: volumeSizeInGb,
	}

	// WHEN
	stack := NewNotebookStack(app, "MyStack", props)

	// THEN
	template := assertions.Template_FromStack(stack, nil)

	// Test that the stack includes an AWS IAM Role resource
	template.HasResourceProperties(jsii.String("AWS::IAM::Role"),
		map[string]interface{}{
			"AssumeRolePolicyDocument": map[string]interface{}{
				"Version": "2012-10-17",
				"Statement": []map[string]interface{}{
					{
						"Effect": "Allow",
						"Principal": map[string]interface{}{
							"Service": "sagemaker.amazonaws.com",
						},
						"Action": "sts:AssumeRole",
					},
				},
			},
		})

	// Test that the notebook instance has the correct properties
	template.HasResourceProperties(jsii.String("AWS::SageMaker::NotebookInstance"),
		map[string]interface{}{
			"InstanceType":         instanceType,
			"NotebookInstanceName": notebookName,
			"DirectInternetAccess": "Enabled",
			"RootAccess":           "Disabled",
			"VolumeSizeInGB":       volumeSizeInGb,
		})
}
