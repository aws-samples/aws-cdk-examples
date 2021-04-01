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
	"github.com/aws/jsii-runtime-go"
)

type StaticSiteProps struct {
	DomainName string
}

/**
 * Static site infrastructure, which deploys site content to an S3 bucket.
 *
 * The site redirects from HTTP to HTTPS, using a CloudFront distribution,
 * Route53 alias record, and ACM certificate.
 */
func NewStaticSite(parent awscdk.Construct, id *string, props *StaticSiteProps) {
	zone := awsroute53.HostedZone_FromLookup(parent, jsii.String("Zone"), &awsroute53.HostedZoneProviderProps{
		DomainName: &props.DomainName,
	})

	// Content Bucket
	bucket := awss3.NewBucket(parent, jsii.String(fmt.Sprint("SiteBucket")), &awss3.BucketProps{
		WebsiteIndexDocument: jsii.String("index.html"),
		WebsiteErrorDocument: jsii.String("error.html"),
		PublicReadAccess:     jsii.Bool(true),
		// By default the RETAIN removal policy requires manual removal.
		// Setting it to DESTROY will attempt to delete the bucket and
		// will fail unless the bucket is empty.
		RemovalPolicy: awscdk.RemovalPolicy_DESTROY,
	})
	awscdk.NewCfnOutput(parent, jsii.String("Bucket"), &awscdk.CfnOutputProps{
		Value: bucket.BucketName(),
	})

	// TLS Certificate
	certificate := awscertificatemanager.NewDnsValidatedCertificate(
		parent,
		jsii.String("Certificate"),
		&awscertificatemanager.DnsValidatedCertificateProps{
			DomainName: &props.DomainName,
			HostedZone: zone,
			Region:     jsii.String("us-east-1"),
		})

	// CloudFront distribution that provides HTTPS
	distribution := awscloudfront.NewCloudFrontWebDistribution(
		parent,
		jsii.String("SiteDistribution"),
		&awscloudfront.CloudFrontWebDistributionProps{
			AliasConfiguration: &awscloudfront.AliasConfiguration{
				AcmCertRef: certificate.CertificateArn(),
				Names: &[]*string{
					jsii.String(fmt.Sprintf("https://%s", props.DomainName)),
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
	awscdk.NewCfnOutput(parent, jsii.String("DistributionId"), &awscdk.CfnOutputProps{
		Value: distribution.DistributionId(),
	})

	// Route53 ailas record for the CloudFront distribution
	awsroute53.NewARecord(parent, jsii.String("SiteAliasRecord"), &awsroute53.ARecordProps{
		RecordName: &props.DomainName,
		Target:     awsroute53.NewRecordTarget(&[]*string{}, awsroute53targets.NewCloudFrontTarget(distribution)),
		Zone:       zone,
	})

	awss3deployment.NewBucketDeployment(parent, jsii.String("DeployWithInvalidation"), &awss3deployment.BucketDeploymentProps{
		Sources: &[]awss3deployment.ISource{
			awss3deployment.Source_Asset(jsii.String("./site-contents"), &awss3assets.AssetOptions{}),
		},
		DestinationBucket: bucket,
		Distribution:      distribution,
		DistributionPaths: &[]*string{
			jsii.String("/*"),
		},
	})
}
