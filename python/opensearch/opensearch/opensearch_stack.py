'''
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
'''

from aws_cdk import (
    aws_opensearchservice as opensearch,
    aws_iam as iam,
    aws_ec2 as ec2,
    aws_sns as sns,
    aws_sns_subscriptions as subscriptions,
    Aws, CfnOutput, Stack, RemovalPolicy, SecretValue, Duration
)
from aws_cdk.aws_s3_assets import Asset
from constructs import Construct
import fileinput
import json
import os
import random
import string
import sys

# Jump host specific settings to run nginx proxy
EC2_INSTANCE_TYPE='t3.nano'

# Fill this in with a valid email to receive SNS notifications.
SNS_NOTIFICATION_EMAIL='user@example.com'

# OpenSearch specific constants, change this config if you would like you to change instance type, count and size
DOMAIN_NAME = 'opensearch-stack-demo'
DOMAIN_ADMIN_UNAME='opensearch'
DOMAIN_ADMIN_PW=''.join(random.choice(string.ascii_uppercase + string.ascii_lowercase + string.digits) for i in range(13)) + random.choice(string.ascii_lowercase) + random.choice(string.ascii_uppercase) + random.choice(string.digits) + "!"
DOMAIN_DATA_NODE_INSTANCE_TYPE='m6g.large.search'
DOMAIN_DATA_NODE_INSTANCE_COUNT=2
DOMAIN_INSTANCE_VOLUME_SIZE=100
DOMAIN_AZ_COUNT=2


## By default opensearch stack will be setup without dedicated master node, to have dedicated master node in stack do change the number of nodes and type (if needed)
## Maximum Master Instance count supported by service is 5, so either have 3 or 5 dedicated node for master
DOMAIN_MASTER_NODE_INSTANCE_TYPE='c6g.large.search'
DOMAIN_MASTER_NODE_INSTANCE_COUNT=0

## To enable UW, please make master node count as 3 or 5, and UW node count as minimum 2
## Also change data node to be non T2/T3 as UW does not support T2/T3 as data nodes
DOMAIN_UW_NODE_INSTANCE_TYPE='ultrawarm1.medium.search'
DOMAIN_UW_NODE_INSTANCE_COUNT=0

class OpenSearchStack(Stack):
    def __init__(self, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        ################################################################################
        # VPC
        vpc = ec2.Vpc(self, "OpenSearch VPC", max_azs=3)


        ################################################################################
        # Amazon OpenSearch Service domain
        es_sec_grp = ec2.SecurityGroup(self, 'OpenSearchSecGrp',
                                        vpc=vpc,
                                        allow_all_outbound=True,
                                        security_group_name='OpenSearchSecGrp')
        es_sec_grp.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(80))
        es_sec_grp.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(443))

        vpc_subnets = ec2.SubnetSelection(
            subnet_type=ec2.SubnetType.PUBLIC
        )
        domain = opensearch.Domain(self, 'opensearch-stack-demo',
            version=opensearch.EngineVersion.OPENSEARCH_1_3, # Upgrade when CDK upgrades
            domain_name=DOMAIN_NAME,
            removal_policy=RemovalPolicy.DESTROY,
            capacity=opensearch.CapacityConfig(
                data_node_instance_type=DOMAIN_DATA_NODE_INSTANCE_TYPE,
                data_nodes=DOMAIN_DATA_NODE_INSTANCE_COUNT,
                master_node_instance_type=DOMAIN_MASTER_NODE_INSTANCE_TYPE,
                master_nodes=DOMAIN_MASTER_NODE_INSTANCE_COUNT,
                warm_instance_type=DOMAIN_UW_NODE_INSTANCE_TYPE,
                warm_nodes=DOMAIN_UW_NODE_INSTANCE_COUNT
            ),
            ebs=opensearch.EbsOptions(
                enabled=True,
                volume_size=DOMAIN_INSTANCE_VOLUME_SIZE,
                volume_type=ec2.EbsDeviceVolumeType.GP3
            ),
            vpc=vpc,
            vpc_subnets=[vpc_subnets],
            security_groups=[es_sec_grp],
            zone_awareness=opensearch.ZoneAwarenessConfig(
                enabled=True,
                availability_zone_count=DOMAIN_AZ_COUNT
            ),
            enforce_https=True,
            node_to_node_encryption=True,
            encryption_at_rest={
                "enabled": True
            },
            use_unsigned_basic_auth=True,
            fine_grained_access_control={
                "master_user_name": DOMAIN_ADMIN_UNAME,
                "master_user_password": SecretValue.unsafe_plain_text(DOMAIN_ADMIN_PW)
            }
        )

        CfnOutput(self, "MasterUser",
                        value=DOMAIN_ADMIN_UNAME,
                        description="Master User Name for Amazon OpenSearch Service")

        CfnOutput(self, "MasterPW",
                        value=DOMAIN_ADMIN_PW,
                        description="Master User Password for Amazon OpenSearch Service")

        ################################################################################
        # Jump host to setup nginx proxy
        sn_public = ec2.SubnetSelection(subnet_type=ec2.SubnetType.PUBLIC)
        amzn_linux = ec2.MachineImage.latest_amazon_linux(
            generation=ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
            edition=ec2.AmazonLinuxEdition.STANDARD,
            virtualization=ec2.AmazonLinuxVirt.HVM,
            storage=ec2.AmazonLinuxStorage.GENERAL_PURPOSE
            )

        # Instance Role and SSM Managed Policy
        role = iam.Role(self, "OpenSearchInstanceSSM", assumed_by=iam.ServicePrincipal("ec2.amazonaws.com"))
        role.add_managed_policy(iam.ManagedPolicy.from_aws_managed_policy_name("service-role/AmazonEC2RoleforSSM"))
        role.add_managed_policy(iam.ManagedPolicy.from_aws_managed_policy_name("AmazonSSMManagedInstanceCore"))

        instance = ec2.Instance(self, 'opensearch-proxy-instance',
                                instance_type=ec2.InstanceType(EC2_INSTANCE_TYPE),
                                vpc=vpc,
                                machine_image=amzn_linux,
                                vpc_subnets=sn_public,
                                role=role,
                                )
        instance.connections.allow_from_any_ipv4(ec2.Port.tcp(22), 'SSH')
        instance.connections.allow_from_any_ipv4(ec2.Port.tcp(443), 'HTTPS')

        stmt = iam.PolicyStatement(actions=['es:*'],
                                   resources=[domain.domain_arn])
        instance.add_to_role_policy(stmt)


        # Create SNS topic, subscription for alerting
        sns_topic = sns.Topic(self, "opensearch_demo_topic")

        sns_topic.add_subscription(subscriptions.EmailSubscription(SNS_NOTIFICATION_EMAIL))

        sns_policy_statement=iam.PolicyStatement(
          actions=["sns:publish"],
          resources=[sns_topic.topic_arn],
          effect=iam.Effect.ALLOW
        )
        sns_policy = iam.ManagedPolicy(self, "opensearch_demo_policy")
        sns_policy.add_statements(sns_policy_statement)

        sns_role = iam.Role(self, "opensearch_demo_sns_role",
                            assumed_by=iam.ServicePrincipal("es.amazonaws.com")
                            )
        sns_role.add_managed_policy(sns_policy)


    # Add custom files which needs to be used as an asset
        # Generally used for running post deployment commands such as to create index templates, manage ISM policy, create alerts etc
        dirname = os.path.dirname(__file__)

        # Add dashboards assets, Shows sample to import default dashboard for Sample web logs
        dashboards_asset = Asset(self, "DashboardsAsset", path=os.path.join(dirname, '../confs/export_opensearch_dashboards_web_logs.ndjson'))
        dashboards_asset.grant_read(instance.role)
        dashboards_asset_path = instance.user_data.add_s3_download_command(
            bucket=dashboards_asset.bucket,
            bucket_key=dashboards_asset.s3_object_key,
        )

        # Configuration for nginx proxy
        nginx_asset = Asset(self, "NginxAsset", path=os.path.join(dirname, '../confs/nginx_opensearch.conf'))
        nginx_asset.grant_read(instance.role)
        nginx_asset_path = instance.user_data.add_s3_download_command(
            bucket=nginx_asset.bucket,
            bucket_key=nginx_asset.s3_object_key,
        )

        # Adhoc script to show samples for creating ISM, Alerts, Users etc
        post_deployment_asset = Asset(self, "PostDeploymentAsset", path=os.path.join(dirname, '../confs/post_deployment_objects.sh'))
        post_deployment_asset.grant_read(instance.role)
        post_deployment_asset_path = instance.user_data.add_s3_download_command(
            bucket=post_deployment_asset.bucket,
            bucket_key=post_deployment_asset.s3_object_key,
        )


        instance.user_data.add_commands(
            "yum update -y",
            "yum install jq -y",
            "amazon-linux-extras install nginx1.12",
            "mkdir -p /home/ec2-user/assets",
            "cd /home/ec2-user/assets",
            "mv {} export_opensearch_dashboards_web_logs.ndjson".format(dashboards_asset_path),
            "mv {} nginx_opensearch.conf".format(nginx_asset_path),
            "mv {} post_deployment_objects.sh".format(post_deployment_asset_path),

            "pip install opensearch-py==1.0.0",
            "wget https://raw.githubusercontent.com/aiven/demo-opensearch-python/main/full_format_recipes.json",


            "openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/nginx/cert.key -out /etc/nginx/cert.crt -subj /C=US/ST=./L=./O=./CN=.\n"
            "cp nginx_opensearch.conf /etc/nginx/conf.d/",
            "sed -i 's/DOMAIN_ENDPOINT/" + domain.domain_endpoint + "/g' /etc/nginx/conf.d/nginx_opensearch.conf",
            "sed -i 's/DOMAIN_ENDPOINT/" + domain.domain_endpoint + "/g' /home/ec2-user/assets/post_deployment_objects.sh",
            "sed -i 's=SNS_ROLE_ARN=" + sns_role.role_arn + "=g' /home/ec2-user/assets/post_deployment_objects.sh",
            "sed -i 's/SNS_TOPIC_ARN/" + sns_topic.topic_arn + "/g' /home/ec2-user/assets/post_deployment_objects.sh",
            "sed -i 's=DOMAIN_ADMIN_UNAME=" + DOMAIN_ADMIN_UNAME + "=g' /home/ec2-user/assets/post_deployment_objects.sh",
            "sed -i 's=DOMAIN_ADMIN_PW=" + DOMAIN_ADMIN_PW + "=g' /home/ec2-user/assets/post_deployment_objects.sh",

            "systemctl restart nginx.service",
            "chmod 500 post_deployment_objects.sh",
            "sleep 5",
            "bash --verbose post_deployment_objects.sh",
        )

        CfnOutput(self, "Dashboards URL (via Jump host)",
                        value="https://" + instance.instance_public_ip,
                        description="Dashboards URL via Jump host")

        CfnOutput(self, "SNS Subscription Alert Message",
                        value=SNS_NOTIFICATION_EMAIL,
                        description="Please confirm your SNS subscription received at")



