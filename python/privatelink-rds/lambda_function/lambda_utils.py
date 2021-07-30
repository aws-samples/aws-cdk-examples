import json
import logging
import random
import re
import sys

import boto3
from botocore.exceptions import ClientError

import dns.resolver

logger = logging.getLogger()
logger.setLevel(logging.INFO)

try:
    to_unicode = unicode
except NameError:
    to_unicode = str

try:
    elbv2_client = boto3.client('elbv2')
except ClientError as e:
    logger.error("ERROR: failed to connect to elbv2 client.")
    logger.error(e.response['Error']['Message'])
    sys.exit(1)

def render_list(ip_list):
    """
    Format list of IPs to what target group API call expects
    """
    target_list = []
    for ip in ip_list:
        target = {
            'Id': ip
        }
        target_list.append(target)
    return target_list

def register_target(tg_arn, new_target_list):
    """
    Register resolved IPs to the NLB target group
    """
    logger.info("INFO: Register new_target_list:{}".format(new_target_list))
    id_list = render_list(new_target_list)
    try:
        elbv2_client.register_targets(
            TargetGroupArn=tg_arn,
            Targets=id_list
        )
    except ClientError:
        logger.error("ERROR: IP Targets registration failed.")
        raise


def deregister_target(tg_arn, dereg_target_list):
    """
      Deregister missing IPs from the target group
    """

    id_list = render_list(dereg_target_list)
    try:
        logger.info("INFO: Deregistering {}".format(dereg_target_list))
        elbv2_client.deregister_targets(
            TargetGroupArn=tg_arn,
            Targets=id_list
        )
    except ClientError:
        logger.error("ERROR: IP Targets deregistration failed.")
        raise


def describe_target_health(tg_arn):
    """
      Get a IP address list of registered targets in the NLB's target group
    """
    registered_ip_list = []
    try:
        response = elbv2_client.describe_target_health(TargetGroupArn=tg_arn)
        for target in response['TargetHealthDescriptions']:
            registered_ip = target['Target']['Id']
            registered_ip_list.append(registered_ip)
    except ClientError:
        logger.error("ERROR: Can't retrieve Target Group information.")
        raise
    return registered_ip_list


def dns_lookup(dns_server, domainname, record_type):
    """
    Get dns lookup results
    :param domain:
    :return: list of dns lookup results
    """
    lookup_result_list = []

    # Select DNS server to use
    myResolver = dns.resolver.Resolver()
    myResolver.domain = ''

    # Apply default DNS Server override
    if dns_server:
        name_server_ip_list = re.split(r'[,; ]+', dns_server)
        myResolver.nameservers = [random.choice(name_server_ip_list)]
    else:
        logger.info("INFO: Using default DNS resolver")
        # logger.info("INFO: Using default DNS "
        #       "resolvers: {}".format(dns.resolver.Resolver().nameservers))
        # myResolver.nameservers = random.choice(dns.resolver.Resolver().nameservers)

    logger.info("INFO: Selected DNS Server: {}".format(myResolver.nameservers))
    # Resolve FQDN
    try:
        logger.info(f"Trying lookup for {domainname}")
        lookupAnswer = myResolver.query(domainname, record_type)
        logger.info(f"Resolved list of {lookupAnswer}")
        for answer in lookupAnswer:
            lookup_result_list.append(str(answer))
            logger.info(f"Resolved {domainname} to {answer}")
    except ClientError:
        raise
    return lookup_result_list
