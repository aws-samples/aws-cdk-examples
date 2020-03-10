#!/usr/bin/env python3

from aws_cdk import core
from etl_pipeline_cdk.etl_pipeline_cdk_stack import EtlPipelineCdkStack
import json

app = core.App()
STAGE = app.node.try_get_context("STAGE")
ENV={
	"region": app.node.try_get_context("REGION"),
	"account": app.node.try_get_context("ACCTID")
}

with open(f"params-{STAGE}.json") as file_obj:
	stack_params=json.load(file_obj)

EtlPipelineCdkStack(app,
                     stack_params['name'],
                     env=ENV,
                     stage=STAGE)
app.synth()
