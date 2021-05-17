#!/usr/bin/env python3

import os
from aws_cdk import core as cdk
from site_stack import StaticSiteStack


app = cdk.App()
props = {
    "namespace": app.node.try_get_context("namespace"),
    "site_bucket": app.node.try_get_context("site_bucket"),
    "domain_certificate_arn": app.node.try_get_context(
        "domain_certificate_arn"
    ),
    "domain_name": app.node.try_get_context("domain_name"),
    "sub_domain_name": app.node.try_get_context("sub_domain_name"),
}
env = cdk.Environment(
    account=os.environ.get(
        "CDK_DEPLOY_ACCOUNT", os.environ["CDK_DEFAULT_ACCOUNT"]
    ),
    region=os.environ.get(
        "CDK_DEPLOY_REGION", os.environ["CDK_DEFAULT_REGION"]
    ),
)

StaticSite = StaticSiteStack(
    scope=app,
    construct_id=f"{props['namespace']}-stack",
    props=props,
    env=env,
    description="static site using S3, CloudFront and Route53",
)

app.synth()
