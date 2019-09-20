#!/usr/bin/env python3

from aws_cdk import core

from elasticbeanstalk_bg_pipeline.elasticbeanstalk_bg_pipeline_stack import ElasticbeanstalkBgPipelineStack


app = core.App()
ElasticbeanstalkBgPipelineStack(app, "ElasticBeanstalkBG")

app.synth()
