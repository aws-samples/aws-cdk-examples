#!/usr/bin/env python3

from aws_cdk import core

from pinpointstream.pinpointstream_stack import PinpointstreamStack


app = core.App()
PinpointstreamStack(app, "pinpointstream")

app.synth()
