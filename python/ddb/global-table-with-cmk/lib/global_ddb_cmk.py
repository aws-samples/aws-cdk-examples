import aws_cdk as cdk
from constructs import Construct
from typing import List

from lib.stacks.cmk_stack import CMKStack
from lib.stacks.dynamo_db_stack import DynamoDBStack


class GlobalDDBTableCMK(cdk.Stack):
    def __init__(
        self,
        scope: Construct,
        id: str,
        table_name: str,
        replication_regions: List[str],
        key_alias: str = None,
        **kwargs
    ) -> None:
        super().__init__(scope, id, **kwargs)

        cmk_stack = CMKStack(
            self,
            "cmk-stack",
            table_name=table_name,
            key_replica_regions=replication_regions,
            key_alias=key_alias,
        )

        ddb_stack = DynamoDBStack(
            self,
            "ddb-stack",
            table_name=table_name,
            table_replica_regions=[
                {
                    "region": region,
                    "key_export_name": cmk_stack.get_key_replica_export_names(region),
                }
                for region in [self.region, *replication_regions]
            ],
        )
        ddb_stack.add_dependency(cmk_stack)
