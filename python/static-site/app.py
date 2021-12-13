#!/usr/bin/env python3

import os
from aws_cdk import App, Environment
from site_stack import StaticSiteStack


app = App()
props = {
    "namespace": app.node.try_get_context("namespace"),
    "domain_name": app.node.try_get_context("domain_name"),
    "sub_domain_name": app.node.try_get_context("sub_domain_name"),
    "domain_certificate_arn": app.node.try_get_context(
        "domain_certificate_arn"
    ),
    "enable_s3_website_endpoint": app.node.try_get_context(
        "enable_s3_website_endpoint"
    ),
    "origin_custom_header_parameter_name": app.node.try_get_context(
        "origin_custom_header_parameter_name"
    ),
    "hosted_zone_id": app.node.try_get_context("hosted_zone_id"),
    "hosted_zone_name": app.node.try_get_context("hosted_zone_name"),
}

env = Environment(
    account=os.environ.get(
        "CDK_DEPLOY_ACCOUNT", os.environ.get("CDK_DEFAULT_ACCOUNT")
    ),
    region=os.environ.get(
        "CDK_DEPLOY_REGION", os.environ.get("CDK_DEFAULT_REGION")
    ),
)

StaticSite = StaticSiteStack(
    scope=app,
    construct_id=f"{props['namespace']}-stack",
    props=props,
    env=env,
    description="Static Site using S3, CloudFront and Route53",
)

app.synth()
