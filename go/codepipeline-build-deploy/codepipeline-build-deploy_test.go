package main

import (
	"testing"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/assertions"
	"github.com/aws/jsii-runtime-go"
)

func TestCodePipelineBuildDeployStack(t *testing.T) {
	// GIVEN
	app := awscdk.NewApp(nil)

	// WHEN
	stack := NewCodePipelineBuildDeployStack(app, "MyStack", nil)

	// THEN
	template := assertions.Template_FromStack(stack, nil)

	// Checks if the ALB listens on port 80
	template.HasResourceProperties(jsii.String("AWS::ElasticLoadBalancingV2::Listener"), map[string]any{
		"Port": 80,
	})
	
	// Checks if the ECS Deployment Controller is set to AWS CodeDeploy
	template.HasResourceProperties(jsii.String("AWS::ECS::Service"), map[string]any{
		"DeploymentController": map[string]any{
			"Type": "CODE_DEPLOY",
		},
	})

	// Checks if the ALB Security Group allows all traffic on port 80
	template.HasResourceProperties(jsii.String("AWS::EC2::SecurityGroup"), map[string]any{
		"SecurityGroupIngress": []any{
			map[string]any{
				"CidrIp": "0.0.0.0/0",
				"FromPort": 80,
				"IpProtocol": "tcp",
				"ToPort": 80,
			},
		},
	})

	// Checks if public access to the S3 Bucket is disabled
	template.HasResourceProperties(jsii.String("AWS::S3::Bucket"), map[string]any{
		"PublicAccessBlockConfiguration": map[string]any{
			"BlockPublicAcls":       true,
			"BlockPublicPolicy":     true,
			"IgnorePublicAcls":      true,
			"RestrictPublicBuckets": true,
		},
	})
}
