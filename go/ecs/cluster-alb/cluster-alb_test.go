package main

import (
	"testing"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/assertions"
	"github.com/aws/jsii-runtime-go"
)

func TestClusterAlbStack(t *testing.T) {
	// GIVEN
	app := awscdk.NewApp(nil)

	// WHEN
	stack := NewClusterAlbStack(app, "MyStack", nil)

	// THEN
	template := assertions.Template_FromStack(stack, &assertions.TemplateParsingOptions{})

	// Checking if we have an ECS Cluster resource in the stack
	template.HasResource(jsii.String("AWS::ECS::Cluster"), map[string]interface{}{})

	// Checking if the ALB TargetGroup listens on port 80
	template.HasResourceProperties(jsii.String("AWS::ElasticLoadBalancingV2::TargetGroup"), map[string]interface{}{
		"Port": 80,
	})

	// Checking if our VPC has the the specified CIDR range
	template.HasResourceProperties(jsii.String("AWS::EC2::VPC"), map[string]any{
		"CidrBlock": "10.25.0.0/16",
	})

	// Checking if the ContainerPort is set to port 80 in the TaskDefinition
	template.HasResourceProperties(jsii.String("AWS::ECS::TaskDefinition"), map[string]any{
		"ContainerDefinitions": []any{
			map[string]any{
				"PortMappings": []any{
					map[string]any{
						"ContainerPort": 80,
					},
				},
			},
		},
	})
}
