#!/usr/bin/env python3

from aws_cdk import App

from dockerized_app_cdk.network_stack import NetworkStack
from dockerized_app_cdk.rds_stack import RDSStack
from dockerized_app_cdk.asg_stack import ASGStack
from dockerized_app_cdk.efs_stack import StorageStack

props = {'namespace': 'NetworkStack '}
app = App()
ns = NetworkStack(app, "NetworkStack", props)

rds = RDSStack(app, "RDSStack", ns.outputs)
rds.add_dependency(ns)

asg = ASGStack(app, "ASGStack", ns.outputs)
asg.add_dependency(ns)

efs = StorageStack(app, "StorageStack", ns.outputs)
app.synth()
