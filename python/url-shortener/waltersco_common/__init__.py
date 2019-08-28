import os
from aws_cdk.core import Stack, Construct, Environment
from aws_cdk import aws_apigateway, aws_route53, aws_route53_targets, aws_certificatemanager, aws_ec2

AWS_ENV = Environment(account=os.environ['WALTERSCO_ACCOUNT'], region=os.environ['WALTERSCO_REGION'])
VPC_ID = os.environ['WALTERSCO_VPC_ID']
ZONE_NAME = os.environ['WALTERSCO_ZONE_NAME']
ZONE_ID = os.environ['WALTERSCO_ZONE_ID']
ZONE_CERT = os.environ['WALTERSCO_ZONE_CERT']


class WaltersCoStack(Stack):
    """
    A base CDK stack class for all stacks defined in our fun little company.
    """

    def __init__(self, scope: Construct, id: str, **kwargs):
        super().__init__(scope, id, env=AWS_ENV, **kwargs)

        # lookup our pre-created VPC by ID
        self._vpc = aws_ec2.Vpc.from_lookup(self, "vpc", vpc_id=VPC_ID)

    @property
    def waltersco_vpc(self) -> aws_ec2.IVpc:
        """
        :return: The walters co. vpc
        """
        return self._vpc

    def map_waltersco_subdomain(self, subdomain: str, api: aws_apigateway.RestApi) -> str:
        """
        Maps a sub-domain of waltersco.co to an API gateway

        :param subdomain: The sub-domain (e.g. "www")
        :param api: The API gateway endpoint
        :return: The base url (e.g. "https://www.waltersco.co")
        """
        domain_name = subdomain + '.' + ZONE_NAME
        url = 'https://' + domain_name

        cert = aws_certificatemanager.Certificate.from_certificate_arn(self, 'DomainCertificate', ZONE_CERT)
        hosted_zone = aws_route53.HostedZone.from_hosted_zone_attributes(self, 'HostedZone',
                                                                         hosted_zone_id=ZONE_ID,
                                                                         zone_name=ZONE_NAME)

        # add the domain name to the api and the A record to our hosted zone
        domain = api.add_domain_name('Domain', certificate=cert, domain_name=domain_name)

        aws_route53.ARecord(
            self, 'UrlShortenerDomain',
            record_name=subdomain,
            zone=hosted_zone,
            target=aws_route53.RecordTarget.from_alias(aws_route53_targets.ApiGatewayDomain(domain)))

        return url


__all__ = ["WaltersCoStack"]
