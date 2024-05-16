import json
import pytest
from aws_cdk import App
from managed_ad.managed_ad_stack import ManagedAdStack


@pytest.fixture
def context_data():
    with open("cdk.context.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    return data


def test_create_new_vpc(context_data):
    context_data["vpc_id"] = None
    with open("cdk.context.json", "w", encoding="utf-8") as f:
        json.dump(context_data, f)

    app = App()
    stack = ManagedAdStack(app, "TestStack")
    vpc = stack.node.try_get_context("vpc")

    # Update the following assertions if the VPC creation logic has changed
    assert vpc is not None
    assert vpc.vpc_id is not None
    assert vpc.vpc_id != "vpc-0123456789abcdef"  # Assert that a new VPC is created


def test_use_existing_vpc(context_data):
    existing_vpc_id = "vpc-0123456789abcdef"
    context_data["vpc_id"] = existing_vpc_id
    with open("cdk.context.json", "w", encoding="utf-8") as f:
        json.dump(context_data, f)

    app = App()
    stack = ManagedAdStack(app, "TestStack")
    vpc = stack.node.try_get_context("vpc")

    # Update the following assertions if the existing VPC usage logic has changed
    assert vpc is not None
    assert vpc.vpc_id == existing_vpc_id
