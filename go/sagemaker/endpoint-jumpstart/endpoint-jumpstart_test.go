package main

import (
	"log"
	"testing"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/assertions"
	"github.com/aws/jsii-runtime-go"
)

func TestStack(t *testing.T) {
	// GIVEN
	app := awscdk.NewApp(nil)

	jumpstartModelId := "huggingface-text2text-flan-t5-small"
	jumpstartModelVersion := "1.3.2"
	sageMakerInferenceInstanceType := jsii.String("ml.g5.2xlarge")
	endpointName := jsii.String("flan-t5-small-endpoint")

	props := &EndpointJumpstartStackProps{
		StackProps: awscdk.StackProps{
			Env: env(),
		},
		InstanceType: sageMakerInferenceInstanceType,
		EndpointName: endpointName,
	}

	err := loadJumpstartModelInfo(
		props, jumpstartModelId, jumpstartModelVersion,
	)
	if err != nil {
		log.Fatalf("Error: %v", err)
		return
	}

	// WHEN
	stack := NewEndpointJumpstartStack(app, "MyStack", props)

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

	// Find the AWS IAM Role resources
	iamRoles := template.FindResources(jsii.String("AWS::IAM::Role"), nil)
	var role string
	for key := range *iamRoles {
		role = key
	}

	//Test that the stack includes a SageMaker model resource
	template.HasResourceProperties(jsii.String("AWS::SageMaker::Model"),
		map[string]interface{}{
			"ExecutionRoleArn": map[string]interface{}{
				"Fn::GetAtt": []interface{}{
					role, "Arn",
				},
			},
		})

	// Test that the SageMaker model inference environment variables are set
	template.HasResourceProperties(jsii.String("AWS::SageMaker::Model"),
		map[string]interface{}{
			"Containers": []interface{}{
				map[string]interface{}{
					"Environment": map[string]interface{}{
						"MODEL_CACHE_ROOT":  "/opt/ml/model",
						"SAGEMAKER_PROGRAM": "inference.py",
					},
				},
			},
		})

	// Test that the stack includes a SageMaker endpoint resource
	template.HasResourceProperties(jsii.String("AWS::SageMaker::Endpoint"),
		map[string]interface{}{
			"EndpointConfigName": map[string]interface{}{
				"Fn::GetAtt": []interface{}{
					"EndpointConfig", "EndpointConfigName",
				},
			},
			"EndpointName": "flan-t5-small-endpoint",
		})
}
