package main

import (
	"testing"

	"github.com/aws/aws-cdk-go/awscdk"
	"github.com/aws/aws-cdk-go/awscdk/assertions"
	"github.com/stretchr/testify/suite"
	"github.com/stretchr/testify/assert"
	"github.com/aws/jsii-runtime-go"
)

type LambdaCronTestSuite struct {
	suite.Suite
	Template assertions.Template
}

func (suite *LambdaCronTestSuite) SetupTest() {
	app := awscdk.NewApp(nil)
	stack := NewLambdaCronStack(app, "MyStack", nil)
	suite.Template = assertions.Template_FromStack(stack)
}

func (suite *LambdaCronTestSuite) TestResourcesCreated() {
	suite.Template.ResourceCountIs(jsii.String("AWS::Lambda::Function"), jsii.Number(1))
	suite.Template.ResourceCountIs(jsii.String("AWS::Events::Rule"), jsii.Number(1))
}

func (suite *LambdaCronTestSuite) TestCorrectLambdaProperties() {
	dependencyCapture := assertions.NewCapture()

	suite.Template.HasResource(jsii.String("AWS::Lambda::Function"), map[string]interface{}{
		"Properties": map[string]interface{}{
			"Code": map[string]interface{}{
				"S3Bucket": map[string]interface{}{
					"Ref": assertions.Match_AnyValue(),
				},
			},
			"Handler": jsii.String("handler.main"),
			"Runtime": jsii.String("python3.6"),
			"Timeout": jsii.Number(300),
		},
		"DependsOn": []interface{}{dependencyCapture},
	})

	assert.Regexp(suite.T(), "SingletonServiceRole", *dependencyCapture.AsString())
}

func (suite *LambdaCronTestSuite) TestCorrectIamPermissions() {
	roleCapture := assertions.NewCapture()

	suite.Template.HasResourceProperties(jsii.String("AWS::IAM::Role"), map[string]interface{}{
		"AssumeRolePolicyDocument": assertions.Match_ObjectLike(&map[string]interface{}{
			"Statement": []interface{}{map[string]interface{}{
				"Action": jsii.String("sts:AssumeRole"),
				"Effect": jsii.String("Allow"),
				"Principal": map[string]interface{}{
					"Service": jsii.String("lambda.amazonaws.com"),
				},
			}},
		}),
		"ManagedPolicyArns": []interface{}{map[string]interface{}{
			"Fn::Join": assertions.Match_ArrayWith(&[]interface{}{[]interface{}{
				"arn:", map[string]interface{}{"Ref": jsii.String("AWS::Partition")}, roleCapture,
			}}),
		}},
	})

	assert.Regexp(suite.T(), "AWSLambdaBasicExecutionRole", *roleCapture.AsString())
}

func (suite *LambdaCronTestSuite) TestLambdaNotInVpc() {
	suite.Template.HasResource(jsii.String("AWS::Lambda::Function"), map[string]interface{}{
		"Vpc": assertions.Match_AbsentProperty(),
	})
}

func (suite *LambdaCronTestSuite) TestCorrectEventRule() {
	suite.Template.HasResourceProperties(jsii.String("AWS::Events::Rule"), map[string]interface{}{
		"ScheduleExpression": jsii.String("cron(0 18 ? * MON-FRI *)"),
		"State": "ENABLED",
		"Targets": assertions.Match_AnyValue(),
	})
}

func TestLambdaCronSuite(t *testing.T) {
	suite.Run(t, new(LambdaCronTestSuite))
}
