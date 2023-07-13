#!/usr/bin/env python3

import aws_cdk as cdk
from typing import List, Optional
from lib.global_ddb_cmk import GlobalDDBTableCMK

TABLE_NAME: str = "global-ddb-cmk-demo"
PRIMARY_REGION: str = "us-east-1"
REPLICATIONS_REGIONS: List[str] = ["us-west-2", "us-east-2"]
KEY_ALIAS: Optional[str] = f"alias/CMK-for-global-DDB-table-{TABLE_NAME}"

app = cdk.App()

GlobalDDBTableCMK(
    app,
    "global-ddb-cmk",
    table_name=TABLE_NAME,
    replication_regions=REPLICATIONS_REGIONS,
    key_alias=KEY_ALIAS,
    env=cdk.Environment(
        region=PRIMARY_REGION,
    ),
)

app.synth()
