import aws_cdk as cdk
import aws_cdk.aws_opensearchservice as cdk_opensearch
import aws_cdk.aws_iam as cdk_iam
import aws_cdk.aws_secretsmanager as cdk_sm
import aws_cdk.aws_ec2 as cdk_ec2

from aws_cdk.aws_opensearchservice import AdvancedSecurityOptions
from aws_cdk.aws_opensearchservice import EncryptionAtRestOptions
from aws_cdk.aws_opensearchservice import EbsOptions
from aws_cdk.aws_opensearchservice import ZoneAwarenessConfig
from aws_cdk import SecretValue

from constructs import Construct

import os

class OpensearchSimpleDomainStack(cdk.Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # OpenSearch versions compatible with k-NN plugin
        # https://docs.aws.amazon.com/opensearch-service/latest/developerguide/knn.html
        # Note that current CDK version does not include OPENSEARCH_2_3, so
        # we must use the custom version instead.
        # https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_opensearchservice/EngineVersion.html
        OPENSEARCH_VERSION = "2.3"

        # Add the authorized IP addresses (using CIDR format) that should
        # be granted access to the OpenSearch Domain.
        # Create an environment variable before running cdk deploy. E.g.:
        # OPENSEARCH_ALLOWED_IP='["33.45.123.8/32"]'
        allowed_ip_addresses = os.environ.get("OPENSEARCH_ALLOWED_IP", "x.x.x.x/32")

        # Creating OpenSearch access policy to restrict
        # access to a specific list of IPs. We are allowing all
        # types of HTTP commands.
        opensearch_access_policy = cdk_iam.PolicyStatement(
            effect=cdk_iam.Effect.ALLOW,
            principals=[cdk_iam.AnyPrincipal()],
            actions=["es:ESHttp*"],
            resources=[],
            conditions={
                "IpAddress": {
                    "aws:SourceIp": allowed_ip_addresses
                }
            }
        )

        # Generating a secret and storing it with AWS Secrets Manager.
        # https://aws.amazon.com/secrets-manager/
        # To list secret using CLI and jq, run:
        #   aws secretsmanager list-secrets | jq ".SecretList[].Name"
        # To retrieve a secret value using CLI and jq, run:
        #   aws secretsmanager get-secret-value --secret-id <secret-name>
        secret_opensearch_admin_password = cdk_sm.Secret(
            self, "OpenSearchDemoDomainAdminUser")

        # Capacity config documentation:
        # https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_opensearchservice/CapacityConfig.html#aws_cdk.aws_opensearchservice.CapacityConfig
        # Available instance types:
        # https://docs.aws.amazon.com/opensearch-service/latest/developerguide/supported-instance-types.html
        capacity_config = cdk_opensearch.CapacityConfig(
            master_nodes=3,
            master_node_instance_type="t3.small.search",
            data_nodes=3,
            data_node_instance_type="t3.medium.search"
        )

        # Available EBS options
        # https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_opensearchservice/EbsOptions.html#aws_cdk.aws_opensearchservice.EbsOptions
        ebs_config = EbsOptions(
            volume_size=10,
            volume_type=cdk_ec2.EbsDeviceVolumeType.GP3
        )

        # Enabling zone awareness to allow data replication across AZ's.
        # https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_opensearchservice/ZoneAwarenessConfig.html#aws_cdk.aws_opensearchservice.ZoneAwarenessConfig
        zone_awareness_config = ZoneAwarenessConfig(
            availability_zone_count=3,
            enabled=True
        )

        # Required when FGAC is enabled
        encryption_config = EncryptionAtRestOptions(
            enabled=True
        )

        # Required when FGAC is enabled
        opensearch_admin_user = "admin-user"
        advanced_security_config = AdvancedSecurityOptions(
            master_user_name=opensearch_admin_user,
            master_user_password=secret_opensearch_admin_password.secret_value
        )

        aos_domain = cdk_opensearch.Domain(
            self, "OpensearchDemoDomain",
            version=cdk_opensearch.EngineVersion.open_search(
                OPENSEARCH_VERSION),
            capacity=capacity_config,
            ebs=ebs_config,
            access_policies=[opensearch_access_policy],
            enforce_https=True,             # Required when FGAC is enabled
            node_to_node_encryption=True,   # Required when FGAC is enabled
            encryption_at_rest=encryption_config,
            fine_grained_access_control=advanced_security_config,
            zone_awareness=zone_awareness_config
        )

        # Updating Opensearch Domain Access policy with its own resource ARN
        opensearch_access_policy.add_resources(aos_domain.domain_arn + "/*")

        cdk.CfnOutput(self,"OpenSearchDomainEndpoint", value=aos_domain.domain_endpoint)
        cdk.CfnOutput(self,"OpenSearchDashboardsURL", value=(aos_domain.domain_endpoint + "/_dashboards"))
        cdk.CfnOutput(self,"OpenSearchPasswordSecretName", value=secret_opensearch_admin_password.secret_name)
        cdk.CfnOutput(self,"OpenSearchAdminUser", value=opensearch_admin_user)
