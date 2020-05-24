import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as route53 from '@aws-cdk/aws-route53';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3deploy from '@aws-cdk/aws-s3-deployment';
import * as cdk from '@aws-cdk/core';
import * as targets from '@aws-cdk/aws-route53-targets/lib';
import { Construct } from '@aws-cdk/core';
import { PolicyStatement, CanonicalUserPrincipal } from '@aws-cdk/aws-iam';

/**
 * Properties needed to configure the static site.
 */
export interface StaticSiteProps {
    domainName: string;
    certificateArn: string;
    contentPath: string;
}

/**
 * Deploy a static site to S3 with CloudFront and an Origin Access Identity.
 * 
 * This construct does *NOT* create the hosted zone for the domain or the 
 * certificate for the web app subdomain. You must do those manually before 
 * deploying.
 */
export class StaticSite extends Construct {
    constructor(parent: Construct, name: string, props: StaticSiteProps) {
        super(parent, name);

        // Look up the hosted zone from Route53 in your account
        const zone = route53.HostedZone.fromLookup(this, 'Zone', { 
            domainName: props.domainName
        });

        // Output the URL for the site
        const siteOut = new cdk.CfnOutput(this, 'Site', { value: 'https://' + props.domainName });

        // Create a bucket to hold content
        const siteBucket = new s3.Bucket(this, 'SiteBucket', {
            websiteIndexDocument: 'index.html',
            websiteErrorDocument: 'error.html',
            publicReadAccess: false,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        // Output the bucket name
        const bucketOut = new cdk.CfnOutput(this, 'Bucket', { value: siteBucket.bucketName });

        // Create an origin access identity so that the public can be private
        const oai = new cloudfront.CfnCloudFrontOriginAccessIdentity(this, 'OAI', {
            cloudFrontOriginAccessIdentityConfig: { comment: props.domainName }
        });
        
        // Restrict the S3 bucket via a bucket policy that only allows our CloudFront distribution
        const bucketPolicy = new PolicyStatement({
            principals: [new CanonicalUserPrincipal(oai.attrS3CanonicalUserId)],
            actions: ['s3:GetObject'],
            resources: [siteBucket.arnForObjects('*')],
        })
        siteBucket.addToResourcePolicy(bucketPolicy);

        // CloudFront
        const distribution = new cloudfront.CloudFrontWebDistribution(this, 'SiteDistribution', {
            aliasConfiguration: {
                acmCertRef: props.certificateArn,
                names: [ props.domainName ],
                sslMethod: cloudfront.SSLMethod.SNI,
                securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_1_2016,
            },
            originConfigs: [
                {
                    s3OriginSource: {
                        s3BucketSource: siteBucket, 
                        originAccessIdentity: cloudfront.OriginAccessIdentity.fromOriginAccessIdentityName(this, 'OAIRef', oai.ref)
                    },
                    behaviors : [ {isDefaultBehavior: true}]
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
        const deployment = new s3deploy.BucketDeployment(this, 'DeployWithInvalidation', {
            sources: [ s3deploy.Source.asset(props.contentPath) ],
            destinationBucket: siteBucket,
            distribution,
            distributionPaths: ['/*'],
          });
    }
}
