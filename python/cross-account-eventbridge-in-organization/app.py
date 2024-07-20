#!/usr/bin/env python3
from aws_cdk import App

from event_bridge_cross_account.ProducerStack import ProducerStack
from event_bridge_cross_account.ConsumerStack import ConsumerStack


app = App()
ProducerStack(app, "ProducerStack")
ConsumerStack(app, "ConsumerStack")

app.synth()
