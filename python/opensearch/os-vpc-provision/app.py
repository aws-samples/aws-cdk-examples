from aws_cdk import App
from os_vpc_provision.os_vpc_provision_stack import OpenSearchVpcProvisionStack

app = App()
OpenSearchVpcProvisionStack(app, "opensearch-stack-demo")
app.synth()
