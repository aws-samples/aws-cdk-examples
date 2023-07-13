import aws_cdk as cdk
from aws_cdk import aws_dynamodb as ddb
from constructs import Construct
from typing import List
from typing_extensions import TypedDict


class ReplicaConfig(TypedDict):
    region: str
    key_export_name: str


class DynamoDBStack(cdk.NestedStack):
    def __init__(
        self,
        scope: Construct,
        id: str,
        table_name: str,
        table_replica_regions: List[ReplicaConfig],
        **kwargs
    ) -> None:
        super().__init__(scope, id, **kwargs)

        ddb.CfnGlobalTable(
            self,
            "global-table",
            table_name=table_name,
            billing_mode="PAY_PER_REQUEST",
            attribute_definitions=[
                ddb.CfnGlobalTable.AttributeDefinitionProperty(
                    attribute_name="id", attribute_type="S"
                )
            ],
            key_schema=[
                ddb.CfnGlobalTable.KeySchemaProperty(
                    attribute_name="id", key_type="HASH"
                )
            ],
            replicas=[
                ddb.CfnGlobalTable.ReplicaSpecificationProperty(
                    region=replica_config["region"],
                    sse_specification=ddb.CfnGlobalTable.ReplicaSSESpecificationProperty(
                        kms_master_key_id=cdk.Fn.import_value(
                            replica_config["key_export_name"]
                        )
                    ),
                )
                for replica_config in table_replica_regions
            ],
            sse_specification=ddb.CfnGlobalTable.SSESpecificationProperty(
                sse_enabled=True, sse_type="KMS"
            ),
            stream_specification=ddb.CfnGlobalTable.StreamSpecificationProperty(
                stream_view_type="KEYS_ONLY"
            ),
        )
