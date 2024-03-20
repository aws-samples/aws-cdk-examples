import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import * as route53resolver from "@aws-cdk/aws-route53resolver-alpha";
import { R53ResolverVPC } from "./vpc";
import * as path from "path";

export class R53ResolverStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // @see https://docs.aws.amazon.com/cdk/api/v2/docs/aws-route53resolver-alpha-readme.html

    // Example of directly including domains in a list.
    const directBlockList = new route53resolver.FirewallDomainList(
      this,
      "BlockList",
      {
        domains: route53resolver.FirewallDomains.fromList([
          "example.com",
          "example.net",
        ]),
      }
    );

    // Create a rule group to handle our list of blocked domains.
    const ruleGroup = new route53resolver.FirewallRuleGroup(
      this,
      "BlockListRuleGroup",
      {
        rules: [
          {
            priority: 10,
            firewallDomainList: directBlockList,
            action: route53resolver.FirewallRuleAction.block(),
          },
        ],
      }
    );

    // Create a VPC for us to deploy into.
    const vpc = new R53ResolverVPC(this, "R53ResolverTestVPC");

    new cdk.CfnOutput(this, "VPCId", { value: vpc.vpc.vpcId });

    ruleGroup.associate("DirectBlockListRuleGroupAssociation", {
      priority: 101,
      vpc: vpc.vpc,
    });
  }
}
