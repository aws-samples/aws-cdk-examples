import * as cdk from 'aws-cdk-lib';
import * as r53resolver from 'aws-cdk-lib/aws-route53resolver';

import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';


export class Route53ResolverDnsFirewallStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props: cdk.StackProps) {
        super(scope, id, props);

        const vpc = new ec2.Vpc(this, 'Vpc', {
            ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16')
        });

        const logGroup = new logs.LogGroup(
            this,
            'DNSFirewallLogGroup',
            {
                logGroupName: 'DNSQueryLogging',
                retention: logs.RetentionDays.ONE_WEEK,
            }
        );
        logGroup.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

        const dnsLoggingConfig = new r53resolver.CfnResolverQueryLoggingConfig(
            this, 'DNSLogsConfig',
            {
                name: 'DNSCWLogsConfig',
                destinationArn: logGroup.logGroupArn,
            }
        );

        new r53resolver.CfnResolverQueryLoggingConfigAssociation(
            this,
            'DNSLogAssoc',
            {
                resolverQueryLogConfigId: dnsLoggingConfig.ref,
                resourceId: vpc.vpcId,
            }
        );
        const allowedDomainList = new r53resolver.CfnFirewallDomainList(
            this, 'AllowedDomainList',
            {
                name: 'AllowedFirewallDomainList',
                domains: ['*']
            }
        );

        const blockDomainList = new r53resolver.CfnFirewallDomainList(
            this,
            'BlockedDomainList',
            {
                name: 'BlockDomainList',
                domains: ['test.example.com', 'test1.example.com']
            }
        );

        const ruleGroup = new r53resolver.CfnFirewallRuleGroup(
            this,
            'DNSRuleGroup',
            {
                name: 'FirewallRuleGroup',
                firewallRules: [
                    {
                        priority: 10,
                        firewallDomainListId: blockDomainList.ref,
                        action: 'BLOCK',
                        blockResponse: 'NXDOMAIN',
                    },
                    {
                        priority: 20,
                        firewallDomainListId: allowedDomainList.ref,
                        action: 'ALLOW',
                    }

                ],
            }
        );

        const cfnFirewallRuleGroupAssociation = new r53resolver.CfnFirewallRuleGroupAssociation(this, 'FirewallRuleGroupAssociation', {
            firewallRuleGroupId: ruleGroup.ref,
            priority: 101,
            vpcId: vpc.vpcId,
            mutationProtection: 'ENABLED'
        });
    }
}