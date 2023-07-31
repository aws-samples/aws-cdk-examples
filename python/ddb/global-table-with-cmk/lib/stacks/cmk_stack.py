import aws_cdk as cdk
from aws_cdk import aws_kms as kms, custom_resources as cr, aws_iam as iam
from constructs import Construct
from typing import List


class CMKStack(cdk.NestedStack):
    _key_arn_export_prefix = "cmk-key-arn"

    def __init__(
        self,
        scope: Construct,
        id: str,
        table_name: str,
        key_replica_regions: List[str],
        key_alias: str = None,
        **kwargs,
    ) -> None:
        super().__init__(scope, id, **kwargs)

        key_id = kms.CfnKey(
            self,
            "multi-region-cmk",
            key_policy={
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "AWS": f"arn:aws:iam::{self.account}:root",
                        },
                        "Action": "kms:*",
                        "Resource": "*",
                    },
                ],
            },
            description=f"CMK for {table_name} in {self.region}",
            enable_key_rotation=True,
            enabled=True,
            multi_region=True,
        ).attr_key_id

        kms.CfnAlias(
            self,
            "multi-region-cmk-alias",
            alias_name=key_alias
            or f"alias/multi-region-cmk-for-ddb-table-{table_name}",
            target_key_id=key_id,
        )

        self._create_cfn_output_key_arn(self.region, key_id)
        for replica_region in key_replica_regions:
            self._create_key_replica(replica_region, key_id)

    def _create_cfn_output_key_arn(self, key_region: str, key_id: str):
        cdk.CfnOutput(
            self,
            f"{key_region}-key-arn",
            value=f"arn:aws:kms:{key_region}:{self.account}:key/{key_id}",
            export_name=f"{self._key_arn_export_prefix}{key_region}",
        )

    def _create_key_replica(self, replica_region: str, key_id: str):
        aws_sdk_call = cr.AwsSdkCall(
            service="KMS",
            action="replicateKey",
            physical_resource_id=cr.PhysicalResourceId.of(
                "CustomResource::KeyReplicaCreation"
            ),
            parameters={"KeyId": key_id, "ReplicaRegion": replica_region},
        )

        cr.AwsCustomResource(
            self,
            f"{replica_region}-custom-resource",
            on_create=aws_sdk_call,
            on_update=aws_sdk_call,
            policy=cr.AwsCustomResourcePolicy.from_statements(
                [
                    iam.PolicyStatement(
                        effect=iam.Effect.ALLOW,
                        actions=["kms:*"],
                        resources=["*"],
                    )
                ]
            ),
        )
        self._create_cfn_output_key_arn(replica_region, key_id)

    def get_key_replica_export_names(self, region: str):
        return f"{self._key_arn_export_prefix}{region}"
