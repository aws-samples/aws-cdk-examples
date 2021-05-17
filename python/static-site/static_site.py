"""
A construct to host static sites in aws using S3, cloudfront and Route53.

This construct uses S3 API endpoint as an origin in cloudfront, which creates
an Origin Access Identity (OAI) to access the s3 objects. 

This approach keeps the S3 bucket secure without needing to grant GetObject 
permission to anonymous users. Also, it doesn't require the S3 bucket to be
defined as WebSite.
"""
from aws_cdk import (
    core as cdk,
    aws_s3 as s3,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_certificatemanager as acm,
    aws_route53 as route53,
    aws_route53_targets as targets,
)


class StaticSite(cdk.Construct):
    def __init__(
        self,
        scope,
        construct_id,
        domain_name,
        site_bucket_name=None,
        domain_certificate_arn=None,
        sub_domain_name=None,
        **kwargs,
    ):
        super().__init__(scope, construct_id, **kwargs)

        # Instance variables
        self.__site_bucket_name = site_bucket_name
        self.__domain_name = domain_name
        self.__site_domain_name = domain_name
        self.__domain_certificate_arn = domain_certificate_arn

        # Public variables
        self.bucket = None
        self.certificate = None
        self.distribution = None

        # If sub domain is provided, adds it to the site domain name
        if sub_domain_name:
            self.__site_domain_name = f"{sub_domain_name}.{domain_name}"

        # Create the S3 bucket for the site contents
        self.__create_site_bucket()

        # Get the hosted zone based on the provided domain name
        hosted_zone = self.__get_hosted_zone()

        # Get an existing or create a new certificate for the site domain
        self.__create_certificate(hosted_zone)

        # Create the cloud front distribution
        self.__create_cloudfront_distribution()

        # Create a Route53 record
        self.__create_route53_record(hosted_zone)

    def __create_site_bucket(self):
        """Create the S3 bucket for the static site construct

        It creates a secure s3 bucket (blocked public access).
        """

        self.bucket = s3.Bucket(
            self,
            "site_bucket",
            bucket_name=self.__site_bucket_name,
            encryption=s3.BucketEncryption.S3_MANAGED,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=cdk.RemovalPolicy.DESTROY,
            auto_delete_objects=True,
        )

    def __get_hosted_zone(self):
        return route53.HostedZone.from_lookup(
            self, "hosted_zone", domain_name=self.__domain_name
        )

    def __create_certificate(self, hosted_zone):
        if self.__domain_certificate_arn:
            # If certificate arn is provided, import the certificate
            self.certificate = acm.Certificate.from_certificate_arn(
                self,
                "site_certificate",
                certificate_arn=self.__domain_certificate_arn,
            )
        else:
            # If certificate arn is not provided, create a new one
            self.certificate = acm.Certificate(
                self,
                "site_certificate",
                domain_name=self.__site_domain_name,
                validation=acm.CertificateValidation.from_dns(hosted_zone),
            )

    def __create_cloudfront_distribution(self):
        """Create a cloudfront distribution with site bucket as the origin"""

        self.distribution = cloudfront.Distribution(
            self,
            "cloudfront_distribution",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3Origin(self.bucket),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            ),
            domain_names=[self.__site_domain_name],
            certificate=self.certificate,
            default_root_object="index.html",
        )

    def __create_route53_record(self, hosted_zone):
        route53.ARecord(
            self,
            "site-alias-record",
            record_name=self.__site_domain_name,
            zone=hosted_zone,
            target=route53.RecordTarget.from_alias(
                targets.CloudFrontTarget(self.distribution)
            ),
        )
