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
	DomainName *string
	SubdomainName *string
}

/**
 * Static site infrastructure, which deploys site content to an S3 bucket.
 *
 * The site redirects from HTTP to HTTPS, using a CloudFront distribution,
 * Route53 alias record, and ACM certificate.
 */
func NewStaticSiteStack(scope constructs.Construct, id string, props *StaticSiteProps) awscdk.Stack {

	var sprops awscdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}
	stack := awscdk.NewStack(scope, &id, &sprops)

	zone := awsroute53.HostedZone_FromLookup(stack, jsii.String("Zone"), &awsroute53.HostedZoneProviderProps{
		DomainName: props.DomainName,
	})

	siteDomain := fmt.Sprintf("%s.%s", *props.SubdomainName, *props.DomainName);
	awscdk.NewCfnOutput(stack, jsii.String("Site"), &awscdk.CfnOutputProps{
		Value: jsii.String(fmt.Sprintf("https://%s", siteDomain)),
	});

	// Content Bucket
	bucket := awss3.NewBucket(stack, jsii.String(fmt.Sprint("SiteBucket")), &awss3.BucketProps{
		BucketName: jsii.String(siteDomain),
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
	certificate := awscertificatemanager.NewDnsValidatedCertificate(stack, jsii.String("SiteCertificate"), &awscertificatemanager.DnsValidatedCertificateProps{
		DomainName: jsii.String(siteDomain),
		HostedZone: zone,
		Region:     jsii.String("us-east-1"),
	})

	awscdk.NewCfnOutput(stack, jsii.String("CertificateArn"), &awscdk.CfnOutputProps{
		Value: certificate.CertificateArn(),
	});

	// CloudFront distribution that provides HTTPS
	distribution := awscloudfront.NewCloudFrontWebDistribution(stack, jsii.String("SiteDistribution"), &awscloudfront.CloudFrontWebDistributionProps{
		AliasConfiguration: &awscloudfront.AliasConfiguration{
			AcmCertRef: certificate.CertificateArn(),
			Names: &[]*string{
				jsii.String(siteDomain),
			},
			SslMethod:      awscloudfront.SSLMethod_SNI,
			SecurityPolicy: awscloudfront.SecurityPolicyProtocol_TLS_V1_1_2016,
		},
		OriginConfigs: &[]*awscloudfront.SourceConfiguration{
			{
				CustomOriginSource: &awscloudfront.CustomOriginConfig{
					DomainName:           bucket.BucketWebsiteDomainName(),
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
		RecordName: jsii.String(siteDomain),
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

func main() {
	app := awscdk.NewApp(nil)

	NewStaticSiteStack(app, "StaticSiteStack", &StaticSiteProps{
		DomainName: jsii.String(app.Node().TryGetContext(jsii.String("domain")).(string)),
		SubdomainName: jsii.String(app.Node().TryGetContext(jsii.String("subdomain")).(string)),
		StackProps: awscdk.StackProps{
			Env: Env(),
		},
	})

	app.Synth(nil)
}

// env determines the AWS environment (account+region) in which our stack is to
// be deployed. For more information see: https://docs.aws.amazon.com/cdk/latest/guide/environments.html
func Env() *awscdk.Environment {
	// If unspecified, this stack will be "environment-agnostic".
	// Account/Region-dependent features and context lookups will not work, but a
	// single synthesized template can be deployed anywhere.
	//---------------------------------------------------------------------------
	return &awscdk.Environment{
	 Account: jsii.String("185706627232"),
	 Region:  jsii.String("us-east-1"),
	}

	// Uncomment if you know exactly what account and region you want to deploy
	// the stack to. This is the recommendation for production stacks.
	//---------------------------------------------------------------------------
	// return &awscdk.Environment{
	//  Account: jsii.String("123456789012"),
	//  Region:  jsii.String("us-east-1"),
	// }

	// Uncomment to specialize this stack for the AWS Account and Region that are
	// implied by the current CLI configuration. This is recommended for dev
	// stacks.
	//---------------------------------------------------------------------------
	// return &awscdk.Environment{
	//   Account: jsii.String(os.Getenv("CDK_DEFAULT_ACCOUNT")),
	//   Region:  jsii.String(os.Getenv("CDK_DEFAULT_REGION")),
	// }
}
