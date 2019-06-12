#!/usr/bin/env node
import cloudfront = require('@aws-cdk/aws-cloudfront');
import route53 = require('@aws-cdk/aws-route53');
import s3 = require('@aws-cdk/aws-s3');
import ssm = require('@aws-cdk/aws-ssm');
import cdk = require('@aws-cdk/cdk');
import targets = require('@aws-cdk/aws-route53-targets/lib');

export interface StaticSiteProps {
    domainName: string;
    siteSubDomain: string;
}

/**
 * Static site infrastructure, which uses an S3 bucket for the content.
 *
 * The site redirects from HTTP to HTTPS, using a CloudFront distribution,
 * Route53 alias record, and ACM certificate.
 *
 * The ACM certificate is expected to be created and validated outside of the CDK,
 * with the certificate ARN stored in an SSM Parameter.
 */
export class StaticSite extends cdk.Construct {
    constructor(parent: cdk.Construct, name: string, props: StaticSiteProps) {
        super(parent, name);

        const siteDomain = props.siteSubDomain + '.' + props.domainName;

        // Content bucket
        const siteBucket = new s3.Bucket(this, 'SiteBucket', {
            bucketName: siteDomain,
            websiteIndexDocument: 'index.html',
            websiteErrorDocument: 'error.html',
            publicReadAccess: true
        });
        new cdk.CfnOutput(this, 'Bucket', { value: siteBucket.bucketName });

        // Pre-existing ACM certificate, with the ARN stored in an SSM Parameter
        const certificateArn = new ssm.ParameterStoreString(this, 'ArnParameter', {
            parameterName: 'CertificateArn-' + siteDomain
        }).stringValue;

        // CloudFront distribution that provides HTTPS
        const distribution = new cloudfront.CloudFrontWebDistribution(this, 'SiteDistribution', {
            aliasConfiguration: {
                acmCertRef: certificateArn,
                names: [ siteDomain ],
                sslMethod: cloudfront.SSLMethod.SNI,
                securityPolicy: cloudfront.SecurityPolicyProtocol.TLSv1_1_2016
            },
            originConfigs: [
                {
                    s3OriginSource: {
                        s3BucketSource: siteBucket
                    },
                    behaviors : [ {isDefaultBehavior: true}],
                }
            ]
        });
        new cdk.CfnOutput(this, 'DistributionId', { value: distribution.distributionId });

        // Route53 alias record for the CloudFront distribution
        const zone = new route53.HostedZoneProvider(this, { domainName: props.domainName }).findAndImport(this, 'Zone');
        new route53.ARecord(this, 'SiteAliasRecord', {
            recordName: siteDomain,
            target: route53.AddressRecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
            zone
        });
    }
}
