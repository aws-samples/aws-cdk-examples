from constructs import Construct
from aws_cdk import (
    Stack,
    aws_route53 as route53,
)

class HostedZoneStack(Stack):
  def __init__(self, scope: Construct, construct_id: str, domain: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Test Env
        self.zone = route53.PublicHostedZone(self, "HostedZone", zone_name=domain)
        # use below code to use already created hosted zone
        # self.hostzone = route53.HostedZone.from_lookup(self, "HostedZone", domain_name=domain)
