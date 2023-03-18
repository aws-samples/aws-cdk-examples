package main

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	cloudfront "github.com/aws/aws-cdk-go/awscdk/v2/awscloudfront"
	origins "github.com/aws/aws-cdk-go/awscdk/v2/awscloudfrontorigins"
	iam "github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
	s3 "github.com/aws/aws-cdk-go/awscdk/v2/awss3"
	s3assets "github.com/aws/aws-cdk-go/awscdk/v2/awss3assets"
	s3deploy "github.com/aws/aws-cdk-go/awscdk/v2/awss3deployment"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

type StaticSiteStackProps struct {
	awscdk.StackProps
}

func NewStaticSiteStack(scope constructs.Construct, id string, props *StaticSiteStackProps) awscdk.Stack {
	var sprops awscdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}
	stack := awscdk.NewStack(scope, &id, &sprops)

	// The code that defines your stack goes here

	// Change the bucket name to something unique before deploying
	s3BucketName := "my-static-bucket-v1"
	// route53HostedZone := ""

	// Creates S3 Bucket to store our static site content
	siteBucket := s3.NewBucket(stack, jsii.String("StaticSiteBucket"), &s3.BucketProps{
		BucketName:        jsii.String(s3BucketName),
		BlockPublicAccess: s3.BlockPublicAccess_BLOCK_ALL(),
		PublicReadAccess:  jsii.Bool(false),
		Versioned:         jsii.Bool(true),
	})

	// Creates Origin Access Identity (OAI) to only allow CloudFront to get content
	cloudfrontOAI := cloudfront.NewOriginAccessIdentity(stack, jsii.String("CloudFrontOAI"), &cloudfront.OriginAccessIdentityProps{})

	// Creates a new CloudFront Distribution
	siteDistribution := cloudfront.NewDistribution(stack, jsii.String("StackSiteDistribution"), &cloudfront.DistributionProps{
		DefaultRootObject: jsii.String("index.html"),
		DefaultBehavior: &cloudfront.BehaviorOptions{
			// Sets the S3 Bucket as the origin and tells CloudFront to use the created OAI to access it
			Origin: origins.NewS3Origin(siteBucket, &origins.S3OriginProps{
				OriginId:             jsii.String("CloudFrontS3Access"),
				OriginAccessIdentity: cloudfrontOAI,
			}),
			ViewerProtocolPolicy: cloudfront.ViewerProtocolPolicy_REDIRECT_TO_HTTPS,
		},
		ErrorResponses: &[]*cloudfront.ErrorResponse{
			{
				HttpStatus:         jsii.Number(403),
				ResponseHttpStatus: jsii.Number(403),
				ResponsePagePath:   jsii.String("/error.html"),
			},
		},
	})

	// Adds a policy to the S3 Bucket that allows the OAI to get objects
	siteBucket.AddToResourcePolicy(
		iam.NewPolicyStatement(&iam.PolicyStatementProps{
			Actions: &[]*string{
				jsii.String("s3:GetObject"),
			},
			Resources: &[]*string{
				siteBucket.ArnForObjects(jsii.String("*")),
			},
			Principals: &[]iam.IPrincipal{
				iam.NewCanonicalUserPrincipal(cloudfrontOAI.CloudFrontOriginAccessIdentityS3CanonicalUserId()),
			},
		}),
	)

	// Copies static site files from a local path to the S3 Bucket
	s3deploy.NewBucketDeployment(stack, jsii.String("S3ContentDeployment"), &s3deploy.BucketDeploymentProps{
		DestinationBucket: siteBucket,
		Sources: &[]s3deploy.ISource{
			s3deploy.Source_Asset(jsii.String("./static-content"), &s3assets.AssetOptions{}),
		},
		Distribution: siteDistribution,
		DistributionPaths: &[]*string{
			jsii.String("/*"),
		},
	})

	// Outputs CloudFront endpoint
	awscdk.NewCfnOutput(stack, jsii.String("CloudFrontEndpoint"), &awscdk.CfnOutputProps{
		Value: siteDistribution.DistributionDomainName(),
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
	//  Account: jsii.String(os.Getenv("CDK_DEFAULT_ACCOUNT")),
	//  Region:  jsii.String(os.Getenv("CDK_DEFAULT_REGION")),
	// }
}
