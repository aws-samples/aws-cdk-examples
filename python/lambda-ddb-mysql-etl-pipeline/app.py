#!/usr/bin/env python3

from aws_cdk import core
from etl_pipeline_cdk.etl_pipeline_cdk_stack import EtlPipelineCdkStack

app = core.App()
STAGE = app.node.try_get_context("STAGE")
ENV={
	"region": app.node.try_get_context("REGION"),
	"account": app.node.try_get_context("ACCTID")
}
stack_name = app.node.try_get_context("stack_name")

EtlPipelineCdkStack(app,
                     stack_name,
                     env=ENV,
                     stage=STAGE)
app.synth()
