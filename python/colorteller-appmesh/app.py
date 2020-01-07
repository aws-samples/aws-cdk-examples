#!/usr/bin/env python3

from aws_cdk import core
from aws_cdk.core import Tag

from colorteller_network.colorteller_network_stack import ColorTellerNetworkStack
from colorteller_app.colorteller_app_stack import ColorTellerAppStack
from colorteller_app.colorteller_mesh import ColorTellerAppMeshStack

import os

env = core.Environment(
    account=os.environ["AWS_ACCOUNT"], region=os.environ["AWS_REGION"])

app = core.App()

network = ColorTellerNetworkStack(app, "colorteller-network")

ColorTellerAppMeshStack(app, "colorteller-app-mesh",
                        vpc=network.network_vpc, env=env)

color_app = ColorTellerAppStack(app, "colorteller-app-service",
                                vpc=network.network_vpc)

# example of tagging the stacks
color_app.tags.set_tag(key="Owner", value="Infrastructure")
color_app.tags.set_tag(
    key="UUID", value="77655402-221c-855c-d7da-6f9d603c2e32")

app.synth()
