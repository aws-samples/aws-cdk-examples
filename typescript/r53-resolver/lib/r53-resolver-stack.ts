import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import * as route53resolverAlpha from "@aws-cdk/aws-route53resolver-alpha";
import * as route53resolver from "aws-cdk-lib/aws-route53resolver";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { R53ResolverVPC } from "./vpc";

// An example public IP CIDR, designated as not routable.
// @see https://datatracker.ietf.org/doc/html/rfc5737#section-3
const RFC5737_TEST_NET_3 = "203.0.113.0/24";

export class R53ResolverStack extends cdk.Stack {
  protected targetVpc: Vpc;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // Create a VPC for us to deploy into.
    this.targetVpc = new R53ResolverVPC(this, "R53ResolverTestVPC").vpc;
    this.createDnsFirewall();
    this.createOutboundEndpoint();
    this.createInboundEndpoint();
  }

  createDnsFirewall() {
    // @see https://docs.aws.amazon.com/cdk/api/v2/docs/aws-route53resolver-alpha-readme.html
    // Example of directly including domains in a list.
    const directBlockList = new route53resolverAlpha.FirewallDomainList(
      this,
      "BlockList",
      {
        domains: route53resolverAlpha.FirewallDomains.fromList([
          "example.com",
          "example.net",
        ]),
      }
    );

    // Create a rule group to handle our list of blocked domains.
    const ruleGroup = new route53resolverAlpha.FirewallRuleGroup(
      this,
      "BlockListRuleGroup",
      {
        rules: [
          {
            priority: 10,
            firewallDomainList: directBlockList,
            action: route53resolverAlpha.FirewallRuleAction.block(),
          },
        ],
      }
    );

    ruleGroup.associate("DirectBlockListRuleGroupAssociation", {
      priority: 101,
      vpc: this.targetVpc,
    });

    const consoleBaseUrl = `https://console.aws.amazon.com/`;
    const region = cdk.Stack.of(this).region;
    const vpcBaseUrl = `${consoleBaseUrl}vpc/home?region=${region}`;

    // Output details of the VPC.
    new cdk.CfnOutput(this, "VPC-Id", { value: this.targetVpc.vpcId });
    new cdk.CfnOutput(this, "VPC-Link", {
      value: `https://console.aws.amazon.com/vpcconsole/home/#VpcDetails:VpcId=${this.targetVpc.vpcId}`,
    });

    // Output details of the DNS firewall.
    new cdk.CfnOutput(this, "DNS-Firewall-Id", {
      value: ruleGroup.firewallRuleGroupId,
    });
    new cdk.CfnOutput(this, "DNS-Firewall-Link", {
      value: `${vpcBaseUrl}#DNSFirewallRuleGroupDetails:RulegroupId=${ruleGroup.firewallRuleGroupId}`,
    });
  }

  /**
   * Creates an outbound endpoint, for resources inside the VPC to use as a DNS server.
   */
  createOutboundEndpoint() {
    const sgOutboundEndpoint = new ec2.SecurityGroup(
      this,
      "sg-outbound-endpoint",
      {
        vpc: this.targetVpc,
        allowAllOutbound: true,
        description: "Security group for outbound endpoint",
      }
    );

    sgOutboundEndpoint.addIngressRule(
      ec2.Peer.ipv4(this.targetVpc.vpcCidrBlock),
      ec2.Port.tcp(53)
    );

    sgOutboundEndpoint.addIngressRule(
      ec2.Peer.ipv4(this.targetVpc.vpcCidrBlock),
      ec2.Port.udp(53)
    );

    const subnets = this.targetVpc.selectSubnets({
      subnetType: cdk.aws_ec2.SubnetType.PRIVATE_ISOLATED,
    });
    let subnetList = [];
    for (const subnet of subnets.subnets) {
      subnetList.push(subnet.subnetId);
    }

    // @see https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_route53resolver.CfnResolverEndpoint.html
    // @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-route53resolver-resolverendpoint.html
    const outboundEndpoint = new route53resolver.CfnResolverEndpoint(
      this,
      "OutboundEndpoint",
      {
        direction: "OUTBOUND",
        // Two IP addresses for the endpoint are required.
        ipAddresses: [{ subnetId: subnetList[0] }, { subnetId: subnetList[1] }],
        securityGroupIds: [sgOutboundEndpoint.securityGroupId],
      }
    );

    new cdk.CfnOutput(this, "OutboundEndpointId", {
      value: outboundEndpoint.attrResolverEndpointId,
    });

    const region = cdk.Stack.of(this).region;
    new cdk.CfnOutput(this, "OutboundEndpointLink", {
      value: `https://${region}.console.aws.amazon.com/route53resolver/home?region=${region}#/endpoint/${outboundEndpoint.attrResolverEndpointId}`,
    });
  }

  /**
   * Creates an inbound endpoint, for resources outside the VPC to use as a DNS server.
   */
  createInboundEndpoint() {
    const sgInboundEndpoint = new ec2.SecurityGroup(
      this,
      "sg-inbound-endpoint",
      {
        vpc: this.targetVpc,
        allowAllOutbound: true,
        description: "Security group for inbound endpoint",
      }
    );

    // This VPC is not enabled for traffic from outside, either public
    // or via a private VIF.
    // We are using 203.0.113.0/24 from RFC5737 here just as an example value;
    // you might use an external IP or peered VPC.
    sgInboundEndpoint.addIngressRule(
      ec2.Peer.ipv4(RFC5737_TEST_NET_3),
      ec2.Port.tcp(53)
    );

    sgInboundEndpoint.addIngressRule(
      ec2.Peer.ipv4(RFC5737_TEST_NET_3),
      ec2.Port.udp(53)
    );

    const subnets = this.targetVpc.selectSubnets({
      subnetType: cdk.aws_ec2.SubnetType.PRIVATE_ISOLATED,
    });
    let subnetList = [];
    for (const subnet of subnets.subnets) {
      subnetList.push(subnet.subnetId);
    }

    const inboundEndpoint = new route53resolver.CfnResolverEndpoint(
      this,
      "InboundEndpoint",
      {
        direction: "INBOUND",
        ipAddresses: [{ subnetId: subnetList[0] }, { subnetId: subnetList[1] }],
        securityGroupIds: [sgInboundEndpoint.securityGroupId],
      }
    );

    new cdk.CfnOutput(this, "InboundEndpointId", {
      value: inboundEndpoint.attrResolverEndpointId,
    });

    const region = cdk.Stack.of(this).region;
    new cdk.CfnOutput(this, "InboundEndpointLink", {
      value: `https://${region}.console.aws.amazon.com/route53resolver/home?region=${region}#/endpoint/${inboundEndpoint.attrResolverEndpointId}`,
    });
  }
}
