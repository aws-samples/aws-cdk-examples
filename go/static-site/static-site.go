package main

import (
	"os"

	"github.com/aws/aws-cdk-go/awscdk"
	"github.com/aws/aws-cdk-go/awscdk/awscertificatemanager"
	"github.com/aws/aws-cdk-go/awscdk/awscloudfront"
	"github.com/aws/aws-cdk-go/awscdk/awscloudfrontorigins"
	"github.com/aws/aws-cdk-go/awscdk/awsiam"
	"github.com/aws/aws-cdk-go/awscdk/awsroute53"
	"github.com/aws/aws-cdk-go/awscdk/awsroute53targets"
	"github.com/aws/aws-cdk-go/awscdk/awss3"
	"github.com/aws/aws-cdk-go/awscdk/awss3assets"
	"github.com/aws/aws-cdk-go/awscdk/awss3deployment"
	"github.com/aws/constructs-go/constructs/v3"
	"github.com/aws/jsii-runtime-go"
)

var DOMAIN_NAME string =  //e.g. example.com
var ASSET_PATH string =  //e.g. "C:\\Users\\Documents\\website"

type SecureSiteStackProps struct {
	awscdk.StackProps
}

func SecureSiteStack(scope constructs.Construct, id string, props *SecureSiteStackProps) awscdk.Stack {
	var sprops awscdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}
	stack := awscdk.NewStack(scope, &id, &sprops)

	//cdkBucket is initiated in this step, the asset files will be added to it in the deployment step
	cdkBucket := awss3.NewBucket(stack, jsii.String("cdkBucket"), &awss3.BucketProps{
		AccessControl:          awss3.BucketAccessControl_PRIVATE,
		AutoDeleteObjects:      jsii.Bool(true),
		BlockPublicAccess:      awss3.BlockPublicAccess_BLOCK_ALL(),
		BucketKeyEnabled:       new(bool),
		BucketName:             jsii.String(DOMAIN_NAME),
		Cors:                   &[]*awss3.CorsRule{},
		Encryption:             "",
		EncryptionKey:          nil,
		EnforceSSL:             jsii.Bool(false),
		Inventories:            &[]*awss3.Inventory{},
		LifecycleRules:         &[]*awss3.LifecycleRule{},
		Metrics:                &[]*awss3.BucketMetrics{},
		ObjectOwnership:        "",
		PublicReadAccess:       jsii.Bool(false),
		RemovalPolicy:          awscdk.RemovalPolicy_DESTROY,
		ServerAccessLogsBucket: nil,
		ServerAccessLogsPrefix: new(string),
		Versioned:              jsii.Bool(false),
		WebsiteErrorDocument:   jsii.String(""),
		WebsiteIndexDocument:   jsii.String(""),
		WebsiteRedirect:        nil,
		WebsiteRoutingRules:    nil,
	})

	cdkAsset := awss3deployment.Source_Asset(jsii.String(ASSET_PATH), &awss3assets.AssetOptions{
		Exclude:        &[]*string{},
		Follow:         "",
		IgnoreMode:     "",
		FollowSymlinks: "",
		AssetHash:      new(string),
		AssetHashType:  "",
		Bundling:       nil,
		Readers:        &[]awsiam.IGrantable{},
		SourceHash:     new(string),
	})

	awss3deployment.NewBucketDeployment(stack, jsii.String("cdkDeployment"), &awss3deployment.BucketDeploymentProps{
		DestinationBucket:                     cdkBucket,
		Sources:                               &[]awss3deployment.ISource{cdkAsset},
		AccessControl:                         "",
		CacheControl:                          &[]awss3deployment.CacheControl{},
		ContentDisposition:                    new(string),
		ContentEncoding:                       new(string),
		ContentLanguage:                       new(string),
		ContentType:                           new(string),
		DestinationKeyPrefix:                  new(string),
		Distribution:                          nil,
		DistributionPaths:                     nil,
		Exclude:                               &[]*string{},
		Expires:                               nil,
		Include:                               &[]*string{},
		MemoryLimit:                           jsii.Number(1792),
		Metadata:                              &awss3deployment.UserDefinedObjectMetadata{},
		Prune:                                 new(bool),
		RetainOnDelete:                        new(bool),
		Role:                                  nil,
		ServerSideEncryption:                  "",
		ServerSideEncryptionAwsKmsKeyId:       new(string),
		ServerSideEncryptionCustomerAlgorithm: new(string),
		StorageClass:                          "",
		UseEfs:                                new(bool),
		Vpc:                                   nil,
		VpcSubnets:                            nil,
		WebsiteRedirectLocation:               new(string),
	})

	//an OAI is created to act as a principal in a policy granting cloudfront bucket access
	cdkOAI := awscloudfront.NewOriginAccessIdentity(stack, jsii.String("cdkOAI"), &awscloudfront.OriginAccessIdentityProps{
		Comment: nil,
	})
	//Get OAI Principal identity to add to a new bucket policy
	cdkOAIslice := []awsiam.IPrincipal{cdkOAI.GrantPrincipal()}

	//cdkBucketArn := cdkBucket.BucketArn()
	cdkBucketArn := cdkBucket.ArnForObjects(jsii.String("*"))

	cdkBucketArnSlice := &[]*string{cdkBucketArn}
	//Create policy to give OAI access to bucket
	cdkPermission := awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
		Actions:       jsii.Strings("s3:GetObject"),
		Conditions:    &map[string]interface{}{},
		Effect:        awsiam.Effect_ALLOW,
		NotActions:    &[]*string{},
		NotPrincipals: &[]awsiam.IPrincipal{},
		NotResources:  &[]*string{},
		Principals:    &cdkOAIslice,
		Resources:     cdkBucketArnSlice,
		Sid:           new(string),
	})

	cdkBucket.AddToResourcePolicy(cdkPermission)

	//an origin for cloudfront to point to. This will be used in the cloudfront distributions properties
	bucketOrigin := awscloudfrontorigins.NewS3Origin(cdkBucket, &awscloudfrontorigins.S3OriginProps{
		ConnectionAttempts:   jsii.Number(2),
		ConnectionTimeout:    nil,
		CustomHeaders:        &map[string]*string{},
		OriginPath:           new(string),
		OriginShieldRegion:   new(string),
		OriginAccessIdentity: cdkOAI,
	})

	//An inline javascript function will be used to rewrite URI's
	//The function can be found in this AWS sample
	//https://github.com/aws-samples/amazon-cloudfront-functions/blob/main/url-rewrite-single-page-apps/index.js
	cfnInlineFunction := awscloudfront.FunctionCode_FromInline(jsii.String("function handler(event) {var request = event.request; var uri = request.uri; if (uri.endsWith('/')) {request.uri += 'index.html';} else if (!uri.includes('.')) {request.uri += '/index.html';};return request;}"))

	cfnFunction := awscloudfront.NewFunction(stack, jsii.String("cdkUrlRewrite"), &awscloudfront.FunctionProps{
		Code:         cfnInlineFunction,
		Comment:      jsii.String("Rewrite the uri to add index.html after viewer request"),
		FunctionName: jsii.String("cdkUrlRewriter"),
	})

	cfnFunctionAssoc := awscloudfront.FunctionAssociation{
		EventType: awscloudfront.FunctionEventType_VIEWER_REQUEST,
		Function:  cfnFunction,
	}
	//The function must be contained in a slice which can accomodate multiple functions before being
	//added to the cloudfront distribtuions properties
	cfnfunctionSlice := []*awscloudfront.FunctionAssociation{&cfnFunctionAssoc}

	//Note: looking up a hosted zone by ID below doesn't work because the hosted zone name becomes unavailable
	//cdkZone := awsroute53.HostedZone_FromHostedZoneId(stack, jsii.String("existingZone"), jsii.String("###Z078109######"))

	cdkZone := awsroute53.HostedZone_FromLookup(stack, jsii.String("cdkZone"), &awsroute53.HostedZoneProviderProps{
		DomainName:  jsii.String(DOMAIN_NAME),
		PrivateZone: new(bool),
		VpcId:       new(string),
	})

	cdkCert := awscertificatemanager.NewDnsValidatedCertificate(stack, jsii.String("cdkCert"), &awscertificatemanager.DnsValidatedCertificateProps{
		DomainName:              jsii.String(DOMAIN_NAME),
		SubjectAlternativeNames: &[]*string{},
		Validation:              awscertificatemanager.CertificateValidation_FromDns(cdkZone),
		ValidationDomains:       &map[string]*string{},
		ValidationMethod:        "",
		HostedZone:              cdkZone,
		CustomResourceRole:      nil,
		Region:                  jsii.String("us-east-1"),
		Route53Endpoint:         new(string),
	})

	cdkDistribution := awscloudfront.NewDistribution(stack, jsii.String("cdkDistribution"), &awscloudfront.DistributionProps{
		DefaultBehavior: &awscloudfront.BehaviorOptions{
			AllowedMethods:       nil,
			CachedMethods:        nil,
			CachePolicy:          nil,
			Compress:             new(bool),
			EdgeLambdas:          nil,
			FunctionAssociations: &cfnfunctionSlice, //slightly awk
			OriginRequestPolicy:  nil,
			SmoothStreaming:      new(bool),
			TrustedKeyGroups:     &[]awscloudfront.IKeyGroup{},
			ViewerProtocolPolicy: awscloudfront.ViewerProtocolPolicy_REDIRECT_TO_HTTPS,
			Origin:               bucketOrigin,
		},
		AdditionalBehaviors:    &map[string]*awscloudfront.BehaviorOptions{},
		Certificate:            cdkCert,
		Comment:                new(string),
		DefaultRootObject:      new(string),
		DomainNames:            jsii.Strings(DOMAIN_NAME),
		Enabled:                jsii.Bool(true),
		EnableIpv6:             jsii.Bool(false),
		EnableLogging:          new(bool),
		ErrorResponses:         &[]*awscloudfront.ErrorResponse{},
		GeoRestriction:         nil,
		HttpVersion:            "",
		LogBucket:              nil,
		LogFilePrefix:          new(string),
		LogIncludesCookies:     new(bool),
		MinimumProtocolVersion: "",
		PriceClass:             "",
		WebAclId:               new(string),
	})

	cdkCfnTarget := awsroute53targets.NewCloudFrontTarget(cdkDistribution)

	cdkRecordTarget := awsroute53.AddressRecordTarget_FromAlias(cdkCfnTarget)

	awsroute53.NewARecord(stack, jsii.String("cdkRecord"), &awsroute53.ARecordProps{
		Zone:       cdkZone,
		Comment:    new(string),
		RecordName: nil,
		Ttl:        awscdk.Duration_Seconds(jsii.Number(60)),
		Target:     cdkRecordTarget,
	})

	return stack

}

func main() {
	app := awscdk.NewApp(nil)

	SecureSiteStack(app, "cdkSecureSite", &SecureSiteStackProps{
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
	//return nil

	// Uncomment if you know exactly what account and region you want to deploy
	// the stack to. This is the recommendation for production stacks.
	//---------------------------------------------------------------------------
	/*
		return &awscdk.Environment{
			Account: jsii.String(""),
			Region:  jsii.String(""),
		}
	*/
	// Uncomment to specialize this stack for the AWS Account and Region that are
	// implied by the current CLI configuration. This is recommended for dev
	// stacks.
	//---------------------------------------------------------------------------
	return &awscdk.Environment{
		Account: jsii.String(os.Getenv("CDK_DEFAULT_ACCOUNT")),
		Region:  jsii.String(os.Getenv("CDK_DEFAULT_REGION")),
	}
}
