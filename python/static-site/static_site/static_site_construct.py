from aws_cdk import (
    aws_cloudfront as cloudfront,
    aws_s3 as s3,
    aws_route53 as route53,
    aws_route53_targets as targets,
    aws_ssm as ssm,
    core,
)


class StaticSiteProps(object):

    def __init__(self, domain_name: str, site_sub_domain: str, hosted_zone_id: str):
        self._domain_name = domain_name
        self._site_sub_domain = site_sub_domain
        self._hosted_zone_id = hosted_zone_id

    @property
    def domain_name(self) -> str:
        return self._domain_name

    @property
    def site_sub_domain(self) -> str:
        return self._site_sub_domain

    @property
    def hosted_zone_id(self) -> str:
        return self._hosted_zone_id


class StaticSiteConstruct(core.Construct):
    @property
    def buckets(self):
        return tuple(self._buckets)

    def __init__(self, scope: core.Construct, id: str, props: StaticSiteProps) -> None:
        super().__init__(scope, id)

        site_domain: str = '{sub_domain}.{domain_name}'.format(
            sub_domain=props.site_sub_domain,
            domain_name=props.domain_name
        )

        # Content Bucket
        site_bucket = s3.Bucket(
            self,
            'SiteBucket',
            bucket_name=site_domain,
            website_index_document='index.html',
            website_error_document='error.html',
            public_read_access=True
        )
        core.CfnOutput(self, 'Bucket', value=site_bucket.bucket_name)

        # Pre-existing ACM Certificate, with ARN stored in an SSM Parameter
        certificate_arn: str = ssm.StringParameter.from_string_parameter_attributes(
            self,
            "MYCertArnString",
            parameter_name="CertificateArn-{}".format(site_domain)
        ).string_value

        # CloudFront distribution that provides HTTPS
        alias_configuration = cloudfront.AliasConfiguration(
            acm_cert_ref=certificate_arn,
            names=[site_domain],
            ssl_method=cloudfront.SSLMethod.SNI,
            security_policy=cloudfront.SecurityPolicyProtocol.TLS_V1_1_2016
        )

        source_configuration = cloudfront.SourceConfiguration(
            s3_origin_source=cloudfront.S3OriginConfig(
                s3_bucket_source=site_bucket
            ),
            behaviors=[cloudfront.Behavior(is_default_behavior=True)]
        )

        distribution = cloudfront.CloudFrontWebDistribution(
            self,
            'SiteDistribution',
            alias_configuration=alias_configuration,
            origin_configs=[source_configuration]
        )
        core.CfnOutput(self, 'DistributionId', value=distribution.distribution_id)

        # Route53 alias record for the CloudFront Distribution
        zone = route53.HostedZone.from_hosted_zone_attributes(
            self,
            id="HostedZoneID",
            hosted_zone_id=props.hosted_zone_id,
            zone_name=props.domain_name
        )

        route53.ARecord(
            self,
            'SiteAliasRecord',
            record_name=site_domain,
            target=route53.AddressRecordTarget.from_alias(targets.CloudFrontTarget(distribution)),
            zone=zone
        )
