#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import * as route53 from '@aws-cdk/aws-route53';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3deploy from '@aws-cdk/aws-s3-deployment';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as targets from '@aws-cdk/aws-route53-targets';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import { Construct } from '@aws-cdk/core';

export interface StaticSiteProps {
    domainName: string;
    siteSubDomain: string;
}

/**
 * Static site infrastructure, which deploys site content to an S3 bucket.
 *
 * The site redirects from HTTP to HTTPS, using a CloudFront distribution,
 * Route53 alias record, and ACM certificate.
 */
export class StaticSite extends Construct {
    constructor(parent: Construct, name: string, props: StaticSiteProps) {
        super(parent, name);

        const zone = route53.HostedZone.fromLookup(this, 'Zone', { domainName: props.domainName });
        const siteDomain = props.siteSubDomain + '.' + props.domainName;
        new cdk.CfnOutput(this, 'Site', { value: 'https://' + siteDomain });

        // Content bucket
        const siteBucket = new s3.Bucket(this, 'SiteBucket', {
            bucketName: siteDomain,
            websiteIndexDocument: 'index.html',
            websiteErrorDocument: 'error.html',

            // The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
            // the new bucket, and it will remain in your account until manually deleted. By setting the policy to
            // DESTROY, cdk destroy will attempt to delete the bucket, but will error if the bucket is not empty.
            removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code

            // For sample purposes only, if you create an S3 bucket then populate it, stack destruction fails.  This
            // setting will enable full cleanup of the demo.
            autoDeleteObjects: true // NOT recommended
        });
        new cdk.CfnOutput(this, 'Bucket', { value: siteBucket.bucketName });

        // TLS certificate
        const certificateArn = new acm.DnsValidatedCertificate(this, 'SiteCertificate', {
            domainName: siteDomain,
            hostedZone: zone,
            region: 'us-east-1', // Cloudfront only checks this region for certificates.
        }).certificateArn;
        new cdk.CfnOutput(this, 'Certificate', { value: certificateArn });

        const cloudfrontOAI = new cloudfront.OriginAccessIdentity(this, 'cdn-OAI', {
            comment: `OAI for ${name}`
        });

        // CloudFront distribution that provides HTTPS
        const distribution = new cloudfront.CloudFrontWebDistribution(this, 'SiteDistribution', {
            originConfigs: [
                {
                    s3OriginSource: {
                        s3BucketSource: siteBucket,
                        originAccessIdentity: cloudfrontOAI
                    },
                    behaviors: [
                        {
                            isDefaultBehavior: true,
                            allowedMethods: cloudfront.CloudFrontAllowedMethods.GET_HEAD_OPTIONS,
                            compress: true
                        }
                    ]
                }
            ]
        });
        new cdk.CfnOutput(this, 'DistributionId', { value: distribution.distributionId });

        // Route53 alias record for the CloudFront distribution
        new route53.ARecord(this, 'SiteAliasRecord', {
            recordName: siteDomain,
            target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
            zone
        });

        // Deploy site contents to S3 bucket
        new s3deploy.BucketDeployment(this, 'DeployWithInvalidation', {
            sources: [s3deploy.Source.asset('./site-contents')],
            destinationBucket: siteBucket,
            distribution,
            distributionPaths: ['/*'],
        });
    }
}
