import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as route53 from '@aws-cdk/aws-route53';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3deploy from '@aws-cdk/aws-s3-deployment';
import * as cdk from '@aws-cdk/core';
import * as targets from '@aws-cdk/aws-route53-targets/lib';
import { PolicyStatement, CanonicalUserPrincipal } from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
/**
 * Properties needed to configure the static site.
 */
export interface StaticSiteProps {
    domainName: string;
    certificateArn: string;
    contentPath: string;
    hostedZoneId: string;
}

/**
 * (This is an example of an L3 construct. As opposed to L2s, L3s are opinionated and don't give access to all available underlying resources.)
 * 
 * Deploy a static site to S3 with CloudFront and an Origin Access Identity.
 * 
 * This construct does *NOT* create the hosted zone for the domain or the 
 * certificate for the web app subdomain. You must do those manually before 
 * deploying.
 */
export class StaticSite extends cdk.Construct {

    private bucketName: string;
    private siteBucket: s3.Bucket;
    private deployment: s3deploy.BucketDeployment;

    constructor(parent: cdk.Construct, name: string, props: StaticSiteProps) {
        super(parent, name);

        // Reference the hosted zone (this does not require a context lookup)
        const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'Zone', {
            hostedZoneId: props.hostedZoneId, 
            zoneName: props.domainName + '.'
        });

        // Output the URL for the site
        const siteOut = new cdk.CfnOutput(this, 'Site', { value: 'https://' + props.domainName });

        // Create a bucket to hold content
        this.siteBucket = new s3.Bucket(this, 'SiteBucket', {
            websiteIndexDocument: 'index.html',
            websiteErrorDocument: 'error.html',
            publicReadAccess: false,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        this.bucketName = this.siteBucket.bucketName;

        // Output the bucket name
        const bucketOut = new cdk.CfnOutput(this, 'Bucket', { value: this.siteBucket.bucketName });

        // Create an origin access identity so that the public can be private
        const oai = new cloudfront.CfnCloudFrontOriginAccessIdentity(this, 'OAI', {
            cloudFrontOriginAccessIdentityConfig: { comment: props.domainName }
        });

        // Restrict the S3 bucket via a bucket policy that only allows our CloudFront distribution
        const bucketPolicy = new PolicyStatement({
            principals: [new CanonicalUserPrincipal(oai.attrS3CanonicalUserId)],
            actions: ['s3:GetObject'],
            resources: [this.siteBucket.arnForObjects('*')],
        });
        this.siteBucket.addToResourcePolicy(bucketPolicy);

        // CloudFront
        const distribution = new cloudfront.CloudFrontWebDistribution(this, 'SiteDistribution', {
            aliasConfiguration: {
                acmCertRef: props.certificateArn,
                names: [props.domainName],
                sslMethod: cloudfront.SSLMethod.SNI,
                securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_1_2016,
            },
            originConfigs: [
                {
                    s3OriginSource: {
                        s3BucketSource: this.siteBucket,
                        originAccessIdentity: cloudfront.OriginAccessIdentity.fromOriginAccessIdentityName(this, 'OAIRef', oai.ref)
                    },
                    behaviors: [{ isDefaultBehavior: true }]
                }
            ]
        });

        // Output the distribution ID
        const distroOut = new cdk.CfnOutput(this, 'DistributionId', {
            value: distribution.distributionId
        });

        // Route53 alias record for the CloudFront distribution
        const aout = new route53.ARecord(this, 'SiteAliasRecord', {
            recordName: props.domainName,
            target: route53.AddressRecordTarget.fromAlias(
                new targets.CloudFrontTarget(distribution)),
            zone
        });

        // Deploy contents of the folder to the S3 bucket
        this.deployment = new s3deploy.BucketDeployment(this, 'DeployWithInvalidation', {
            sources: [s3deploy.Source.asset(props.contentPath)],
            destinationBucket: this.siteBucket,
            distribution,
            distributionPaths: ['/*'],
        });
    }

    /**
     * Get the name of the site bucket.
     */
    public getBucketName(): string {
        return this.bucketName;
    }

    /**
     * Grant access to the site bucket.
     */
    public grantAccessTo(f: lambda.Function) {
        this.siteBucket.grantReadWrite(f);
    }

    /**
     * Get a reference to the BucketDeployment.
     */
    public getDeployment() {
        return this.deployment;
    }
}
