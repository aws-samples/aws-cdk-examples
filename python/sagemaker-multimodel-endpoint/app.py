#!/usr/bin/env python3

from aws_cdk import App
from sagemaker_multimodel_endpoint.sagemaker_multimodel_endpoint_stack import SagemakerMultimodelEndpointStack

app = App()


SagemakerMultimodelEndpointStack(
    app,
    "SagemakerMultimodelEndpointStack",
)

app.synth()
