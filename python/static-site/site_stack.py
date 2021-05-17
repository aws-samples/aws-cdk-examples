from aws_cdk import core as cdk
from static_site import StaticSite


class StaticSiteStack(cdk.Stack):
    def __init__(self, scope, construct_id, props, **kwargs):
        super().__init__(scope, construct_id, **kwargs)

        site = StaticSite(
            self,
            f"{props['namespace']}-construct",
            site_bucket_name=props["site_bucket"],
            domain_certificate_arn=props["domain_certificate_arn"],
            domain_name=props["domain_name"],
            sub_domain_name=props["sub_domain_name"],
        )

        # Add stack outputs
        cdk.CfnOutput(
            self,
            "SiteBucketName",
            value=site.bucket.bucket_name,
        )
        cdk.CfnOutput(
            self,
            "DistributionId",
            value=site.distribution.distribution_id,
        )
        cdk.CfnOutput(
            self,
            "CertificateArn",
            value=site.certificate.certificate_arn,
        )
