package main

import (
	"testing"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/assertions"
	"github.com/aws/jsii-runtime-go"
)

func TestStaticSiteStack(t *testing.T) {
	// GIVEN
	app := awscdk.NewApp(nil)

	// WHEN
	stack := NewStaticSiteStack(app, "MyStack", &StaticSiteStackProps{})

	// THEN
	template := assertions.Template_FromStack(stack, &assertions.TemplateParsingOptions{})

	// Checks if public access to the S3 Bucket is disabled
	template.HasResourceProperties(jsii.String("AWS::S3::Bucket"), map[string]any{
		"PublicAccessBlockConfiguration": map[string]any{
			"BlockPublicAcls":       true,
			"BlockPublicPolicy":     true,
			"IgnorePublicAcls":      true,
			"RestrictPublicBuckets": true,
		},
	})

	// Checks if the S3 Bucket has versioning enabled
	template.HasResourceProperties(jsii.String("AWS::S3::Bucket"), map[string]any{
		"VersioningConfiguration": map[string]any{
			"Status": "Enabled",
		},
	})

	// Checks if the CloudFront Distribution redirects traffic from HTTP to HTTPS
	template.HasResourceProperties(jsii.String("AWS::CloudFront::Distribution"), map[string]any{
		"DistributionConfig": map[string]any{
			"DefaultCacheBehavior": map[string]any{
				"ViewerProtocolPolicy": "redirect-to-https",
			},
		},
	})
}
