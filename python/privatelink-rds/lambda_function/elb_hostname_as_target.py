import json
import logging
import os
import sys

import lambda_utils as utils

"""
Configure these environment variables in your Lambda environment or
CloudFormation Inputs settings):

1. TARGET_FQDN (mandatory): The Fully Qualified DNS Name used for application
cluster
2. ELB_TG_ARN (mandatory): The ARN of the Elastic Load Balancer's target group
3. DNS_SERVER (optional): The DNS Servers to query TARGET_FQDN if you do not want to use AWS default (i.e., if you want to run this function attached to a VPC and use its resolver)
"""

if 'TARGET_FQDN' in os.environ:
    TARGET_FQDN = os.environ['TARGET_FQDN']
else:
    print("ERROR: Missing Target Hostname.")
    sys.exit(1)

if 'ELB_TG_ARN' in os.environ:
    ELB_TG_ARN = os.environ['ELB_TG_ARN']
else:
    print("ERROR: Missing Destination Target Group ARN.")
    sys.exit(1)

if 'DNS_SERVER' in os.environ:
    DNS_SERVER = os.environ['DNS_SERVER']
else:
    print("Info: DNS resolver not specified, using default.")
    DNS_SERVER = None


# MAIN Function - This function will be invoked when Lambda is called
def lambda_handler(event, context):
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    logger.info("INFO: Received event: {}".format(json.dumps(event)))
    
    # Get Currently Resgistered IPs list
    logger.info("INFO: Checking existing target group members")
    registered_ip_list = utils.describe_target_health(ELB_TG_ARN)

    # Query DNS for hostname IPs
    logger.info("INFO: Performing DNS lookup")
    try:
        hostname_ip_list = []
        dns_lookup_result = utils.dns_lookup(DNS_SERVER, TARGET_FQDN, "A")
        hostname_ip_list = dns_lookup_result + hostname_ip_list
        logger.info(f"INFO: Hostname IPs resolved by DNS lookup: {format(hostname_ip_list)}")

        # IP list to register with target group, minus existing IPs
        new_ips_to_register_list = list(set(hostname_ip_list) - set(registered_ip_list))

        # Register new targets
        if new_ips_to_register_list:
            logger.info(f"INFO: Registering {format(new_ips_to_register_list)}")
            utils.register_target(ELB_TG_ARN, new_ips_to_register_list)
        else:
            logger.info("INFO: No IPs to register.")


        # IP list to remove from the target group, minus the currently resolved ones
        old_ips_to_remove_list = list(set(registered_ip_list) - set(hostname_ip_list))
        
        # Remove old IPs from the target group
        if old_ips_to_remove_list:
            logger.info(f"INFO: Removing old IPs: {format(old_ips_to_remove_list)}")
            utils.deregister_target(ELB_TG_ARN, old_ips_to_remove_list)
        else:
            logger.info("INFO: Target group members up to date, nothing to remove")

        logger.info("INFO: Update completed successfuly.")

    # Exception handler
    except Exception as e:
        logger.error("ERROR:", e)
        logger.error("ERROR: Invocation failed.")
        return(1)
    return (0)
