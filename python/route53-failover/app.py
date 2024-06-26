#!/usr/bin/env python3
import os

import aws_cdk as cdk

from route53_failover_stack import Route53FailoverStack


app = cdk.App()
Route53FailoverStack(app, 
                     "Route53FailoverStack",
                     domain="aws-partner.io",
                     email="kihoonk@amazon.com",
                     env=cdk.Environment(
                        account=os.getenv('CDK_DEFAULT_ACCOUNT'),
                        region=os.getenv('CDK_DEFAULT_REGION')
                        )
                    )
app.synth()