"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
"""

from os import path
from aws_cdk import (
    App,
    Stack,
    Duration,
    aws_ec2 as ec2,
    aws_cloudtrail as ct,
    aws_iam as iam,
    aws_lambda as lambda_,
    aws_logs as cwl,
    aws_logs_destinations as cwl_destinations,
    aws_opensearchserverless as opensearchserverless,
    RemovalPolicy,
)
import boto3
from aws_cdk.aws_s3_assets import Asset
from constructs import Construct

## Constants
INDEX_NAME = "cwl"
LOG_GROUP_NAME = "SvlCTCWL/svl_cloudtrail_logs"
COLLECTION_NAME = "ctcollection"
CWL_RETENTION = cwl.RetentionDays.THREE_DAYS
ARN_IAM_ROLE = ""  # TODO: add your IAM role which has permission for `arn:aws:aoss:*` for `aoss:*` action.
ENCRYPTIONPOLICY = f"""{{"Rules":[{{"ResourceType":"collection","Resource":["collection/{COLLECTION_NAME}"]}}],"AWSOwnedKey":true}}"""
NETWORKPOLICY = f"""[{{"Description":"Endpoint access for Lambda and for random querying","SourceVPCEs":["VPCENDPOINTID"],"Rules":[{{"ResourceType":"collection","Resource":["collection/{COLLECTION_NAME}"]}}],"AllowFromPublic":false}},{{"Description":"Dashboards access","AllowFromPublic":true,"Rules":[{{"ResourceType":"dashboard","Resource":["collection/{COLLECTION_NAME}"]}}]}}]"""
DATAPOLICY = f"""[
  {{
    "Description": "Endpoint access for Lambda and for random querying",
    "Rules":[
        {{
          "ResourceType":"collection",
          "Resource":["collection/{COLLECTION_NAME}"],
          "Permission":["aoss:*"]
        }},
        {{
          "ResourceType":"index",
          "Resource":["index/{COLLECTION_NAME}/{INDEX_NAME}*"],
          "Permission":["aoss:*"]
        }}
    ],
    "Principal":["{ARN_IAM_ROLE}", "LAMBDAROLEARN"]
  }}
]
"""


class CtcwlOssStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        ################################################################################
        # VPC
        vpc = ec2.Vpc(self, "SvlCTCWLVpc")
        es_sec_grp = ec2.SecurityGroup(
            self,
            "SvlCTCWLOpenSearchSecGrp",
            vpc=vpc,
            allow_all_outbound=True,
            security_group_name="SvlCTCWLSecGrp",
        )
        es_sec_grp.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(80))
        es_sec_grp.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(443))

        endpoint = opensearchserverless.CfnVpcEndpoint(
            self,
            "SvlCTCWLEndpoint",
            name="svlctcwlendpoint",
            vpc_id=vpc.vpc_id,
            security_group_ids=[es_sec_grp.security_group_id],
            subnet_ids=[s.subnet_id for s in vpc.public_subnets],
        )

        ###############################################################################
        # Amazon OpenSearch Serverless collection
        network_policy = NETWORKPOLICY.replace("VPCENDPOINTID", endpoint.attr_id)
        net = opensearchserverless.CfnSecurityPolicy(
            self,
            "SvlCTCWLNetwork",
            name="svlctcwlnetwork",
            description=f"Open access for {COLLECTION_NAME}",
            type="network",
            policy=network_policy,
        )
        print("Network Policy attached to OpenSearch Collection", net.name)
        sec = opensearchserverless.CfnSecurityPolicy(
            self,
            "SvlCTCWLEncryption",
            name="svlctcwlencryption",
            description=f"AWS Owned key policy for {COLLECTION_NAME}",
            type="encryption",
            policy=ENCRYPTIONPOLICY,
        )

        col = opensearchserverless.CfnCollection(
            self, COLLECTION_NAME, name=COLLECTION_NAME, type="TIMESERIES"
        )
        col.add_dependency(sec)

        ###################################################################
        # Lambda for subscription filter
        subscription_filter_lambda = lambda_.Function(
            self,
            "StreamCTCWLtoOSSLambda",
            function_name="bulk_ingest_handler",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="index.handler",
            vpc=vpc,
            memory_size=1024,
            timeout=Duration.minutes(5),
            code=lambda_.Code.from_asset('lambda')
        )

        # Load Amazon OpenSearch Service Collection to env variable
        collection_endpoint = col.attr_collection_endpoint.replace("https://", "")
        print(f"\n\nCollection endpoint: {collection_endpoint}\n")
        subscription_filter_lambda.add_environment(
            "COLLECTION_ENDPOINT", collection_endpoint
        )
        subscription_filter_lambda.add_environment("REGION", self.region)
        subscription_filter_lambda.add_to_role_policy(
            iam.PolicyStatement(actions=["aoss:*"], resources=["*"])
        )
        subscription_filter_lambda.add_to_role_policy(
            iam.PolicyStatement(actions=["logs:*"], resources=["*"])
        )
        subscription_filter_lambda.add_environment("INDEX_NAME", INDEX_NAME)
        #################################################################################
        # The data access policy needs the lambda role ARN to allow writing.
        dap = DATAPOLICY.replace(
            "LAMBDAROLEARN", subscription_filter_lambda.role.role_arn
        )
        dat = opensearchserverless.CfnAccessPolicy(
            self,
            "SvlCTCWLData",
            name="svlctcwldata",
            type="data",
            description=f"Data access for {COLLECTION_NAME}",
            policy=dap,
        )
        print("Data access for collection is created", dat.name)
        ################################################################################
        # CWL Log Group
        log_group = cwl.LogGroup(
            self,
            "SvlCTCWLLogGroup",
            log_group_name=LOG_GROUP_NAME,
            retention=CWL_RETENTION,
            removal_policy=RemovalPolicy.DESTROY,
        )

        ################################################################################
        # CloudTrail trail
        trail = ct.Trail(
            self,
            "SvlCTCWLTrail",
            send_to_cloud_watch_logs=True,
            cloud_watch_log_group=log_group,
        )
        print("CloudTrail is created", trail._physical_name)

        ################################################################################
        # Set up subscription filter
        subscription_filter = cwl.SubscriptionFilter(
            self,
            "SvlCTCWLSubFilter",
            log_group=log_group,
            destination=cwl_destinations.LambdaDestination(subscription_filter_lambda),
            filter_pattern=cwl.FilterPattern.all_events(),
        )
        print(
            "Subscription Filter for CloudTrail is created",
            subscription_filter._physical_name,
        )
