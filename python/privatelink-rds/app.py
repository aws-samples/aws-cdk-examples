#!/usr/bin/env python3

from aws_cdk import (
    core
)

from stacks.vpc_stack import VpcStack
from stacks.sns_stack import SnsStack
from stacks.rds_stack import RdsStack
from stacks.nlb_stack import NlbStack
from stacks.privatelink_stack import PrivatelinkStack
from stacks.lambda_stack import LambdaStack

app = core.App()

props = {
    'vpc_cidr': '192.168.10.0/24',
    'db_port': 3306,
    'principals_to_share_with': [
        'arn:aws:iam::XXXX:root'
    ] # list accounts, OUs, or Org principals here
}

vpc_stack = VpcStack(app, "PrivatelinkRdsDemoVpc",
    vpc_cidr = props['vpc_cidr']
)

sns_stack = SnsStack(app, "PrivatelinkRdsDemoSns")

rds_stack = RdsStack(app, "PrivatelinkRdsDemoDb",
    vpc = vpc_stack.vpc,
    vpc_cidr = props['vpc_cidr'],
    db_port = props['db_port'],
    subnet_group = 'DB',
    sns_topic_arn = sns_stack.topic.topic_arn
)

nlb_stack = NlbStack(app, "PrivatelinkRdsDemoNlb",
    vpc = vpc_stack.vpc,
    subnet_group = 'PrivateIngress',
    db_port = props['db_port']
)

privatelink_stack = PrivatelinkStack(app, "PrivatelinkRdsDemoVpcServiceEndpoint",
    nlb = nlb_stack.nlb,
    principals_to_share_with = props['principals_to_share_with']
)

lambda_stack = LambdaStack(app, "PrivatelinkRdsDemoLambda",
    rds_endpoint = rds_stack.db.db_instance_endpoint_address,
    sns_topic = sns_stack.topic,
    target_group_arn = nlb_stack.target_group.target_group_arn
)

print("Next steps:")
print("1. Populate the target group by executing the Lambda function, either via:")
print("  - Use the AWS console or")
print("  - by getting the function ARN from the above output and running: run_lambda.py ", lambda_stack.function.function_arn)
print("2. In an account listed as allowed in this stack's props section: go to the AWS Console / VPC / Endpoints. Create an endpoint and search for this private service: ", privatelink_stack.endpoint.vpc_endpoint_service_id)

app.synth()
