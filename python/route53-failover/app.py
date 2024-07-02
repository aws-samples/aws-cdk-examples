#!/usr/bin/env python3
import os

import aws_cdk as cdk

from fargate_app_stack import FargateAppStack
from hosted_zone_stack import HostedZoneStack
from healthcheck_alarm_stack import HealthcheckAlarmStack
from alias_healthcheck_record_stack import AliasHealthcheckRecordStack

app = cdk.App()

domain=app.node.try_get_context('domain')
email=app.node.try_get_context('email')
primaryRegion=app.node.try_get_context('primaryRegion')
secondaryRegion=app.node.try_get_context('secondaryRegion')
account=os.getenv('CDK_DEFAULT_ACCOUNT')
region=os.getenv('CDK_DEFAULT_REGION')

# Sample app 1
app1 = FargateAppStack(app, "PrimaryFargateApp", env=cdk.Environment(
    account=account,
    region=primaryRegion
))

# Sample app 2
app2 = FargateAppStack(app, "SecondaryFargateApp", env=cdk.Environment(
    account=account,
    region=secondaryRegion
))

# Hosted Zone
hostedZoneStack = HostedZoneStack(app, "HostedZone", domain=domain, env=cdk.Environment(
    account=account,
    region="us-east-1"
))

HealthcheckAlarmStack(
    app, "HealthCheckAlarm",
    zone=hostedZoneStack.zone,
    primaryLoadBalancer=app1.fargate_service.load_balancer,
    secondaryLoadBalancer=app2.fargate_service.load_balancer,
    email=email,
    env=cdk.Environment(
        account=account,
        region="us-east-1"
    ),
    cross_region_references=True
)

AliasHealthcheckRecordStack(
    app, "AliasHealthCheckRecord",
    zone=hostedZoneStack.zone,
    primaryLoadBalancer=app1.fargate_service.load_balancer,
    secondaryLoadBalancer=app2.fargate_service.load_balancer,
    env=cdk.Environment(
        account=account,
        region="us-east-1"
    ),
    cross_region_references=True
)

app.synth()