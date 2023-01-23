package main

import (
	"testing"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/assertions"
	"github.com/aws/jsii-runtime-go"
)

func TestS3StaticWebsite(t *testing.T) {
	// GIVEN
	app := awscdk.NewApp(nil)

	// WHEN
	stack := NewS3StaticWebsiteStack(app, "MyStack", &S3StaticWebsiteStackProps{
		awscdk.StackProps{
			Env: env(),
		},
		"www",
		"mytestdomainname",
	})

	// THEN
	template := assertions.Template_FromStack(stack)

	template.HasResourceProperties(jsii.String("AWS::S3::Bucket"), map[string]interface{}{
		"BucketName": "mytestdomainname",
		"WebsiteConfiguration": map[string]interface{}{
			"IndexDocument": "index.html",
			"ErrorDocument": "index.html",
		},
	})

	template.HasResourceProperties(jsii.String("AWS::Route53::RecordSet"), map[string]interface{}{
		"Name": "www.mytestdomainname.",
	})

	template.HasResourceProperties(jsii.String("AWS::CloudFront::Distribution"), map[string]interface{}{
		"DistributionConfig": map[string]interface{}{
			"Aliases": []string{"www.mytestdomainname"},
		},
	})
}
