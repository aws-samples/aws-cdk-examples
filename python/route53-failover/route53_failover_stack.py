from constructs import Construct
import aws_cdk as cdk
from aws_cdk import (
    Stack,
    aws_route53 as route53,
)
from aws_cdk.aws_route53_targets import LoadBalancerTarget
from fargate_app.fargate_app_stack import FargateAppStack
from healthcheck_alarm.healthcheck_alarm_stack import HealthcheckAlarmStack

class Route53FailoverStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, domain: str, email:str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Test Env
        hostzone = route53.HostedZone.from_lookup(self, "HostedZone", domain_name=domain)


        # Sample app 1
        app1 = FargateAppStack(self, "PrimaryFargateApp", env=cdk.Environment(
            account=self.account,
            region=self.region
        ))
        nlb1 = app1.fargate_service.load_balancer
        self.primaryHealthCheck = route53.CfnHealthCheck(self, "DNSPrimaryHealthCheck", health_check_config=route53.CfnHealthCheck.HealthCheckConfigProperty(
            fully_qualified_domain_name=nlb1.load_balancer_dns_name,
            type="HTTP",
            port=80
        ))

        # Sample app 2
        app2 = FargateAppStack(self, "SecondaryFargateApp", env=cdk.Environment(
            account=self.account,
            region=self.region
        ))
        nlb2 = app2.fargate_service.load_balancer
        self.secondaryHealthCheck = route53.CfnHealthCheck(self, "DNSSecondaryHealthCheck", health_check_config=route53.CfnHealthCheck.HealthCheckConfigProperty(
            fully_qualified_domain_name=nlb2.load_balancer_dns_name,
            type="HTTP",
            port=80,
        ))


        # primary record
        primary = route53.ARecord(self, "PrimaryRecordSet",
            zone = hostzone,
            record_name="failover",
            target = route53.RecordTarget.from_alias(LoadBalancerTarget(nlb1)),
        )

        primaryRecordSet = primary.node.default_child
        primaryRecordSet.failover = "PRIMARY"
        primaryRecordSet.health_check_id = self.primaryHealthCheck.attr_health_check_id
        primaryRecordSet.set_identifier = "Primary"

        # secondary record
        secondary = route53.ARecord(self, "SecondaryRecordSet",
            zone = hostzone,
            record_name="failover",
            target= route53.RecordTarget.from_alias(LoadBalancerTarget(nlb2)),
        )

        secondaryRecordSet = secondary.node.default_child
        secondaryRecordSet.failover = "SECONDARY"
        secondaryRecordSet.health_check_id = self.secondaryHealthCheck.attr_health_check_id
        secondaryRecordSet.set_identifier = "Secondary"


        HealthcheckAlarmStack(self, "HealthCheckAlarm",
                 cfnHealthCheck=self.primaryHealthCheck,
                 email=email,
                 env=cdk.Environment(
                    account=self.account,
                    region="us-east-1"
                ),
                cross_region_references=True
              )