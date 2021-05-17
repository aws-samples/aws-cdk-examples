import pytest

from aws_cdk import core as cdk
from site_stack import StaticSiteStack


@pytest.fixture(scope="session")
def synth():

    app = cdk.App(
        context={
            "namespace": "static-site",
            "site_bucket": "test-site",
            "domain_certificate_arn": "arn:aws:acm:us-east-1:123456789012:certificate/abc",
            "domain_name": "example.com",
            "sub_domain_name": "blog",
        }
    )

    props = {
        "namespace": app.node.try_get_context("namespace"),
        "site_bucket": app.node.try_get_context("site_bucket"),
        "domain_certificate_arn": app.node.try_get_context(
            "domain_certificate_arn"
        ),
        "domain_name": app.node.try_get_context("domain_name"),
        "sub_domain_name": app.node.try_get_context("sub_domain_name"),
    }
    StaticSiteStack(
        scope=app,
        construct_id=props["namespace"],
        props=props,
        env={"account": "1234567890", "region": "us-east-1"},
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
    assert buckets[0]["Properties"]["BucketName"] == "test-site"
