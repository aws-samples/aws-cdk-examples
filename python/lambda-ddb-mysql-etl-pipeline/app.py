#!/usr/bin/env python3

from aws_cdk import core
from etl_pipeline_cdk.etl_pipeline_cdk_stack import EtlPipelineCdkStack
import os, json

PRE_PROD_ENV={
	"region": "<region_id>",
	"account": "<account_id>"
}

PROD_ENV={
	"region": "<region_id>",
	"account": "<account_id>"
}

STAGE=os.environ.get("AWS_CDK_ENV")

with open(f"params-{STAGE}.json") as file_obj:
	stack_params=json.load(file_obj)

app = core.App()

EtlPipelineCdkStack(app,
                     stack_params['name'],
                     env=PRE_PROD_ENV if STAGE == "preprod" else PROD_ENV,
                     stage=STAGE
                     )
app.synth()
