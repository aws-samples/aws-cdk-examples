package main

import (
	"os"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awscertificatemanager"
	"github.com/aws/aws-cdk-go/awscdk/v2/awscloudfront"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsroute53"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsroute53targets"
	"github.com/aws/aws-cdk-go/awscdk/v2/awss3"
	"github.com/aws/aws-cdk-go/awscdk/v2/awss3assets"
	"github.com/aws/aws-cdk-go/awscdk/v2/awss3deployment"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

type S3StaticWebsiteStackProps struct {
	awscdk.StackProps
	subDomain string
	domain    string
}

func NewS3StaticWebsiteStack(scope constructs.Construct, id string, props *S3StaticWebsiteStackProps) awscdk.Stack {
	var sprops awscdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}

	stack := awscdk.NewStack(scope, &id, &sprops)

	domain := props.subDomain + "." + props.domain

	cloudfrontOAI := awscloudfront.NewOriginAccessIdentity(stack, jsii.String("MyOriginAccessIdentity"), &awscloudfront.OriginAccessIdentityProps{
		Comment: jsii.String("OAI for " + id),
	})

	zone := awsroute53.HostedZone_FromLookup(stack, jsii.String("MyHostedZone"), &awsroute53.HostedZoneProviderProps{
		DomainName: &props.domain,
	})

	bucket := awss3.NewBucket(stack, jsii.String("MyS3Bucket"), &awss3.BucketProps{
		BucketName:           &props.domain,
		WebsiteIndexDocument: jsii.String("index.html"),
		WebsiteErrorDocument: jsii.String("index.html"), // this is required since cloudfront throws 403 Error with angular-routing
		PublicReadAccess:     jsii.Bool(true),
	})

	bucket.AddToResourcePolicy(awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
		Actions:   jsii.Strings("s3:GetObject"),
		Resources: jsii.Strings(*bucket.ArnForObjects(jsii.String("*"))),
		Principals: &[]awsiam.IPrincipal{
			awsiam.NewCanonicalUserPrincipal(cloudfrontOAI.CloudFrontOriginAccessIdentityS3CanonicalUserId()),
		},
	}))

	awscdk.NewCfnOutput(stack, jsii.String("MyBucketDomainName"), &awscdk.CfnOutputProps{
		Value: bucket.BucketDomainName(),
	})

	certificateArn := awscertificatemanager.NewDnsValidatedCertificate(stack, jsii.String("MySiteCertificate"), &awscertificatemanager.DnsValidatedCertificateProps{
		DomainName: &domain,
		HostedZone: zone,
		Region:     jsii.String("us-east-1"), // Cloudfront only checks this region for certificates.
	})

	awscdk.NewCfnOutput(stack, jsii.String("MyCertificateArn"), &awscdk.CfnOutputProps{
		Value: certificateArn.CertificateArn(),
	})

	viewerCertificate := awscloudfront.ViewerCertificate_FromAcmCertificate(
		certificateArn,
		&awscloudfront.ViewerCertificateOptions{
			SslMethod:      awscloudfront.SSLMethod_SNI,
			SecurityPolicy: awscloudfront.SecurityPolicyProtocol_TLS_V1_1_2016,
			Aliases:        jsii.Strings(domain),
		},
	)

	distribution := awscloudfront.NewCloudFrontWebDistribution(stack, jsii.String("MyCloudFrontDistribution"), &awscloudfront.CloudFrontWebDistributionProps{
		ViewerCertificate: viewerCertificate,
		ErrorConfigurations: &[]*awscloudfront.CfnDistribution_CustomErrorResponseProperty{
			{
				ErrorCode:          jsii.Number(403),
				ResponseCode:       jsii.Number(200),
				ErrorCachingMinTtl: jsii.Number(300),
				ResponsePagePath:   jsii.String("/index.html"),
			},
		},
		OriginConfigs: &[]*awscloudfront.SourceConfiguration{
			{
				S3OriginSource: &awscloudfront.S3OriginConfig{
					S3BucketSource:       bucket,
					OriginAccessIdentity: cloudfrontOAI,
				},
				Behaviors: &[]*awscloudfront.Behavior{
					{
						IsDefaultBehavior: jsii.Bool(true),
						Compress:          jsii.Bool(true),
						AllowedMethods:    awscloudfront.CloudFrontAllowedMethods_GET_HEAD_OPTIONS,
					},
				},
			},
		},
	})

	awscdk.NewCfnOutput(stack, jsii.String("MyCloudFrontWebDistributionDomainName"), &awscdk.CfnOutputProps{
		Value: distribution.DistributionDomainName(),
	})

	awsroute53.NewARecord(stack, jsii.String("MySiteAliasRecord"), &awsroute53.ARecordProps{
		RecordName: &domain,
		Target:     awsroute53.RecordTarget_FromAlias(awsroute53targets.NewCloudFrontTarget(distribution)),
		Zone:       zone,
	})

	deployment := awss3deployment.NewBucketDeployment(stack, jsii.String("MyS3BucketDeployment"), &awss3deployment.BucketDeploymentProps{
		Sources: &[]awss3deployment.ISource{
			awss3deployment.Source_Asset(jsii.String("./simple-web-app"), &awss3assets.AssetOptions{}),
		},
		DestinationBucket: bucket,
		Distribution:      distribution,
		DistributionPaths: jsii.Strings("/*"),
	})

	awscdk.NewCfnOutput(stack, jsii.String("Mys3BucketDeploymentPath"), &awscdk.CfnOutputProps{
		Value: deployment.Node().Path(),
	})

	return stack
}

func main() {
	app := awscdk.NewApp(nil)

	NewS3StaticWebsiteStack(app, "S3StaticWebsiteStack", &S3StaticWebsiteStackProps{
		awscdk.StackProps{
			Env: env(),
		},
		app.Node().TryGetContext(jsii.String("subDomain")).(string),
		app.Node().TryGetContext(jsii.String("domain")).(string),
	})

	app.Synth(nil)
}

func env() *awscdk.Environment {
	return &awscdk.Environment{
		Region: jsii.String(os.Getenv("AWS_DEFAULT_REGION")),
	}
}
