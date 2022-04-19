import pytest

from aws_cdk import App
from site_stack import StaticSiteStack


@pytest.fixture(scope="session")
def synth():

    app = App(
        context={
            "namespace": "static-site",
            "domain_name": "example.com",
            "domain_certificate_arn": "arn:aws:acm:us-east-1:123456789012:certificate/abc",
            "sub_domain_name": "blog",
            "origin_custom_header_parameter_name": "/prod/static-site/referer",
            "hosted_zone_id": "ZABCEF12345",
            "hosted_zone_name": "example.com.",
        }
    )
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
    StaticSiteStack(
        scope=app,
        construct_id=props["namespace"],
        props=props,
        env={"account": "123456789012", "region": "us-east-1"},
    )
    return app.synth()


def get_buckets(stack):
    return [
        v
        for k, v in stack.template["Resources"].items()
        if v["Type"] == "AWS::S3::Bucket"
    ]


def test_created_stacks(synth):
    assert {"static-site"} == {x.id for x in synth.stacks}


def test_site_bucket(synth):
    stack = [x for x in synth.stacks if x.id == "static-site"][0]
    buckets = get_buckets(stack)
    assert buckets[0]["Properties"]["BucketName"] == "blog.example.com"
