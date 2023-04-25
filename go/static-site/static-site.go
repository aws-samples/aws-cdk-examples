package main

import (
	"fmt"
	"strings"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	acm "github.com/aws/aws-cdk-go/awscdk/v2/awscertificatemanager"
	cloudfront "github.com/aws/aws-cdk-go/awscdk/v2/awscloudfront"
	origins "github.com/aws/aws-cdk-go/awscdk/v2/awscloudfrontorigins"
	route53 "github.com/aws/aws-cdk-go/awscdk/v2/awsroute53"
	route53targets "github.com/aws/aws-cdk-go/awscdk/v2/awsroute53targets"
	s3 "github.com/aws/aws-cdk-go/awscdk/v2/awss3"
	s3assets "github.com/aws/aws-cdk-go/awscdk/v2/awss3assets"
	s3deploy "github.com/aws/aws-cdk-go/awscdk/v2/awss3deployment"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

type StackConfigs struct {
	HostedZoneName string `field:"optional"`
	Subdomain      string `field:"optional"`
}

type StaticSiteStackProps struct {
	awscdk.StackProps
	stackDetails StackConfigs
}

func NewStaticSiteStack(scope constructs.Construct, id string, props *StaticSiteStackProps) awscdk.Stack {
	var sprops awscdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}
	stack := awscdk.NewStack(scope, &id, &sprops)

	// The code that defines your stack goes here

	var cloudfrontDistribution cloudfront.Distribution
	hostedZoneName := props.stackDetails.HostedZoneName
	subdomain := props.stackDetails.Subdomain

	// Creates Origin Access Identity (OAI) to only allow CloudFront to get content
	cloudfrontOAI := cloudfront.NewOriginAccessIdentity(stack, jsii.String("CloudFrontOAI"), &cloudfront.OriginAccessIdentityProps{})

	// Creates S3 Bucket to store our static site content
	siteBucket := s3.NewBucket(stack, jsii.String("StaticSiteBucket"), &s3.BucketProps{
		BlockPublicAccess: s3.BlockPublicAccess_BLOCK_ALL(),
		PublicReadAccess:  jsii.Bool(false),
		Versioned:         jsii.Bool(true),
	})

	// Adds a policy to the S3 Bucket that allows the OAI to get objects
	siteBucket.GrantRead(cloudfrontOAI, nil)

	cloudfrontDefaultBehavior := &cloudfront.BehaviorOptions{
		// Sets the S3 Bucket as the origin and tells CloudFront to use the created OAI to access it
		Origin: origins.NewS3Origin(siteBucket, &origins.S3OriginProps{
			OriginId:             jsii.String("CloudFrontS3Access"),
			OriginAccessIdentity: cloudfrontOAI,
		}),
		ViewerProtocolPolicy: cloudfront.ViewerProtocolPolicy_REDIRECT_TO_HTTPS,
	}

	cloudfrontErrorResponses := &[]*cloudfront.ErrorResponse{
		{
			HttpStatus:         jsii.Number(403),
			ResponseHttpStatus: jsii.Number(403),
			ResponsePagePath:   jsii.String("/error.html"),
		},
	}

	// If Route 53 Hosted Zone is set, update AWS Certificate Manager, Route 53, and CloudFront accordingly
	if strings.TrimSpace(hostedZoneName) != "" {
		var fullDomain string

		// If a subdomain is not set
		if strings.TrimSpace(subdomain) == "" {
			fullDomain = hostedZoneName
		} else {
			fullDomain = fmt.Sprintf("%s.%s", subdomain, hostedZoneName)
		}

		// Searches Route 53 for existing zone using hosted zone name
		hostedZone := route53.HostedZone_FromLookup(stack, jsii.String("MyHostedZone"), &route53.HostedZoneProviderProps{
			DomainName:  jsii.String(hostedZoneName),
			PrivateZone: jsii.Bool(false),
		})

		awscdk.Annotations_Of(hostedZone).AddInfo(jsii.String("Route 53 Hosted Zone is set"))

		// Creates an SSL/TLS certificate
		certificate := acm.NewCertificate(stack, jsii.String("StaticSiteCert"), &acm.CertificateProps{
			DomainName: jsii.String(fullDomain),
			Validation: acm.CertificateValidation_FromDns(hostedZone),
		})

		// Creates a new CloudFront Distribution with a custom Route 53 domain and custom SSL/TLS Certificate
		cloudfrontDistribution = cloudfront.NewDistribution(stack, jsii.String("SiteDistribution"), &cloudfront.DistributionProps{
			DefaultRootObject: jsii.String("index.html"),
			DefaultBehavior:   cloudfrontDefaultBehavior,
			ErrorResponses:    cloudfrontErrorResponses,
			Certificate:       certificate,
			DomainNames: &[]*string{
				jsii.String(fullDomain),
			},
		})

		// Creates Route 53 record to point to the CloudFront Distribution
		publicEndpoint := route53.NewARecord(stack, jsii.String("Route53ToCloudFront"), &route53.ARecordProps{
			Zone:       hostedZone,
			RecordName: jsii.String(subdomain),
			Target:     route53.RecordTarget_FromAlias(route53targets.NewCloudFrontTarget(cloudfrontDistribution)),
		})

		// Outputs public Route 53 endpoint
		awscdk.NewCfnOutput(stack, jsii.String("Route53Endpoint"), &awscdk.CfnOutputProps{
			Value: publicEndpoint.DomainName(),
		})
	} else {
		awscdk.Annotations_Of(stack).AddInfo(jsii.String("Route 53 Hosted Zone is NOT set"))

		// Creates a new CloudFront Distribution
		cloudfrontDistribution = cloudfront.NewDistribution(stack, jsii.String("SiteDistribution"), &cloudfront.DistributionProps{
			DefaultRootObject: jsii.String("index.html"),
			DefaultBehavior:   cloudfrontDefaultBehavior,
			ErrorResponses:    cloudfrontErrorResponses,
		})
	}

	// Copies site assets from a local path to the S3 Bucket
	s3deploy.NewBucketDeployment(stack, jsii.String("S3ContentDeployment"), &s3deploy.BucketDeploymentProps{
		DestinationBucket: siteBucket,
		Sources: &[]s3deploy.ISource{
			s3deploy.Source_Asset(jsii.String("./site-assets"), &s3assets.AssetOptions{}),
		},
		Distribution: cloudfrontDistribution,
		DistributionPaths: &[]*string{
			jsii.String("/*"),
		},
	})

	// Outputs CloudFront endpoint
	awscdk.NewCfnOutput(stack, jsii.String("CloudFrontEndpoint"), &awscdk.CfnOutputProps{
		Value: cloudfrontDistribution.DistributionDomainName(),
	})

	// Outputs S3 Bucket endpoint (to show that it's not public)
	awscdk.NewCfnOutput(stack, jsii.String("S3BucketEndpoint"), &awscdk.CfnOutputProps{
		Value: siteBucket.BucketDomainName(),
	})

	return stack
}

func main() {
	defer jsii.Close()

	app := awscdk.NewApp(nil)

	NewStaticSiteStack(app, "StaticSiteStack", &StaticSiteStackProps{
		awscdk.StackProps{
			Env: env(),
		},
		StackConfigs{
			// Optional
			// Set to an existing public Route 53 Hosted Zone in your control e.g. "amazon.com". Otherwise, set to ""
			HostedZoneName: "",

			// Optional
			// Add a subdomain to the hosted zone e.g. "aws". Otherwise, set to ""
			Subdomain: "",
		},
	})
	app.Synth(nil)
}

// env determines the AWS environment (account+region) in which our stack is to
// be deployed. For more information see: https://docs.aws.amazon.com/cdk/latest/guide/environments.html
func env() *awscdk.Environment {
	// If unspecified, this stack will be "environment-agnostic".
	// Account/Region-dependent features and context lookups will not work, but a
	// single synthesized template can be deployed anywhere.
	//---------------------------------------------------------------------------
	return nil

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
	// 	Account: jsii.String(os.Getenv("CDK_DEFAULT_ACCOUNT")),
	// 	Region:  jsii.String(os.Getenv("CDK_DEFAULT_REGION")),
	// }
}
