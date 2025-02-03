#!/usr/bin/env python3

import cdk_nag
import aws_cdk as cdk
from cdk.message_api import MessageAPI


app = cdk.App()
MessageAPI(app, 'MessagingRESTAPI')
cdk.Aspects.of(app).add(cdk_nag.AwsSolutionsChecks(verbose=True))
app.synth()
