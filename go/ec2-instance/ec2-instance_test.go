package main

import (
	"testing"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/assertions"
	"github.com/aws/jsii-runtime-go"
)

func TestEc2InstanceStack(t *testing.T) {
	// GIVEN
	app := awscdk.NewApp(nil)

	// WHEN
	stack := NewEc2InstanceStack(app, "MyStack", nil)

	// THEN
	template := assertions.Template_FromStack(stack, nil)

	// A single t3.nano instance
	template.ResourceCountIs(jsii.String("AWS::EC2::Instance"), jsii.Number(1))
	template.HasResourceProperties(jsii.String("AWS::EC2::Instance"), map[string]interface{}{
		"InstanceType": "t3.nano",
	})

	// The AMI is resolved from the Amazon Linux 2023 SSM parameter
	template.HasParameter(jsii.String("*"), map[string]interface{}{
		"Type":    "AWS::SSM::Parameter::Value<AWS::EC2::Image::Id>",
		"Default": assertions.Match_StringLikeRegexp(jsii.String("^/aws/service/ami-amazon-linux-latest/al2023-ami-")),
	})

	// The instance role allows Session Manager access
	template.HasResourceProperties(jsii.String("AWS::IAM::Role"), map[string]interface{}{
		"ManagedPolicyArns": assertions.Match_ArrayWith(&[]interface{}{
			map[string]interface{}{
				"Fn::Join": assertions.Match_ArrayWith(&[]interface{}{
					assertions.Match_ArrayWith(&[]interface{}{
						":iam::aws:policy/AmazonSSMManagedInstanceCore",
					}),
				}),
			},
		}),
	})
}
