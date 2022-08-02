from aws_cdk import (
    core,
)

from servicediscovery.service_discovery import HttpApiServiceDiscovery
from servicediscovery.service_discovery import PrivateDnsServiceDiscovery
from ec2.ec2 import Vpc
from ec2.ec2 import Ec2

props = {'namespace': 'yyo'}

app = core.App()

# vpc
vpc = Vpc(app, f"{props['namespace']}-vpc", props)
ec2 = Ec2(app, f"{props['namespace']}-ec2", vpc.outputs)
ec2.add_dependency(vpc)

# service discovery
http_api_sd = HttpApiServiceDiscovery(app, f"{props['namespace']}-http-sd", props)
private_dns_sd = PrivateDnsServiceDiscovery(app, f"{props['namespace']}-private-dns-sd", vpc.outputs)
private_dns_sd.add_dependency(vpc)

app.synth()
