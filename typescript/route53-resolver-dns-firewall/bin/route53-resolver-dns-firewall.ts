#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { Route53ResolverDnsFirewallStack } from '../lib/route53-resolver-dns-firewall-stack';

const app = new cdk.App();
new Route53ResolverDnsFirewallStack(app, 'Route53ResolverDnsFirewallStack', {

});