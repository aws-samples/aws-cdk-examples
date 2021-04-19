package main

import (
	"fmt"

	"github.com/aws/aws-cdk-go/awscdk"
	"github.com/aws/aws-cdk-go/awscdk/awscertificatemanager"
	"github.com/aws/aws-cdk-go/awscdk/awscloudfront"
	"github.com/aws/aws-cdk-go/awscdk/awsroute53"
	"github.com/aws/aws-cdk-go/awscdk/awsroute53targets"
	"github.com/aws/aws-cdk-go/awscdk/awss3"
	"github.com/aws/aws-cdk-go/awscdk/awss3assets"
	"github.com/aws/aws-cdk-go/awscdk/awss3deployment"
	"github.com/aws/constructs-go/constructs/v3"
	"github.com/aws/jsii-runtime-go"
)

type StaticSiteProps struct {
	awscdk.StackProps
}

/**
 * Static site infrastructure, which deploys site content to an S3 bucket.
 *
 * The site redirects from HTTP to HTTPS, using a CloudFront distribution,
 * Route53 alias record, and ACM certificate.
 */
func NewStaticSiteStack(scope constructs.Construct, id string, props StaticSiteProps) awscdk.Stack {
	stack := awscdk.NewStack(scope, &id, &props.StackProps)

	var domainName *string
	domainName = awscdk.NewCfnParameter(stack, jsii.String("DomainName"), &awscdk.CfnParameterProps{
		Default: "test.com",
		Type:    jsii.String("String"),
	}).ValueAsString()

	//domainName = jsii.String("test.com")
	zone := awsroute53.HostedZone_FromLookup(stack, jsii.String("Zone"), &awsroute53.HostedZoneProviderProps{
		DomainName: domainName,
	})

	// Content Bucket
	bucket := awss3.NewBucket(stack, jsii.String(fmt.Sprint("SiteBucket")), &awss3.BucketProps{
		WebsiteIndexDocument: jsii.String("index.html"),
		WebsiteErrorDocument: jsii.String("error.html"),
		PublicReadAccess:     jsii.Bool(true),
		// By default the RETAIN removal policy requires manual removal.
		// Setting it to DESTROY will attempt to delete the bucket and
		// will fail unless the bucket is empty.
		RemovalPolicy: awscdk.RemovalPolicy_DESTROY,
	})
	awscdk.NewCfnOutput(stack, jsii.String("Bucket"), &awscdk.CfnOutputProps{
		Value: bucket.BucketName(),
	})

	// TLS Certificate
	certificate := awscertificatemanager.NewDnsValidatedCertificate(
		stack,
		jsii.String("Certificate"),
		&awscertificatemanager.DnsValidatedCertificateProps{
			DomainName: domainName,
			HostedZone: zone,
			Region:     jsii.String("us-east-1"),
		})

	// CloudFront distribution that provides HTTPS
	distribution := awscloudfront.NewCloudFrontWebDistribution(
		stack,
		jsii.String("SiteDistribution"),
		&awscloudfront.CloudFrontWebDistributionProps{
			AliasConfiguration: &awscloudfront.AliasConfiguration{
				AcmCertRef: certificate.CertificateArn(),
				Names: &[]*string{
					jsii.String(fmt.Sprintf("https://%v", domainName)),
				},
				SslMethod:      awscloudfront.SSLMethod_SNI,
				SecurityPolicy: awscloudfront.SecurityPolicyProtocol_TLS_V1_1_2016,
			},
			OriginConfigs: &[]*awscloudfront.SourceConfiguration{
				{
					CustomOriginSource: &awscloudfront.CustomOriginConfig{
						DomainName:           bucket.BucketDomainName(),
						OriginProtocolPolicy: awscloudfront.OriginProtocolPolicy_HTTP_ONLY,
					},
					Behaviors: &[]*awscloudfront.Behavior{
						{IsDefaultBehavior: jsii.Bool(true)},
					},
				},
			},
		})
	awscdk.NewCfnOutput(stack, jsii.String("DistributionId"), &awscdk.CfnOutputProps{
		Value: distribution.DistributionId(),
	})

	// Route53 ailas record for the CloudFront distribution
	awsroute53.NewARecord(stack, jsii.String("SiteAliasRecord"), &awsroute53.ARecordProps{
		RecordName: domainName,
		Target:     awsroute53.NewRecordTarget(&[]*string{}, awsroute53targets.NewCloudFrontTarget(distribution)),
		Zone:       zone,
	})

	awss3deployment.NewBucketDeployment(stack, jsii.String("DeployWithInvalidation"), &awss3deployment.BucketDeploymentProps{
		Sources: &[]awss3deployment.ISource{
			awss3deployment.Source_Asset(jsii.String("./site-contents"), &awss3assets.AssetOptions{}),
		},
		DestinationBucket: bucket,
		Distribution:      distribution,
		DistributionPaths: &[]*string{
			jsii.String("/*"),
		},
	})

	return stack
}
