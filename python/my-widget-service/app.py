#!/usr/bin/env python3

from aws_cdk import core

from my_widget_service.my_widget_service_stack import MyWidgetServiceStack


app = core.App()
MyWidgetServiceStack(app, "my-widget-service-cdk-1")
app.synth()
