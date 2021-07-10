

from aws_cdk import (
  aws_wafv2      as wafv2,
  core,
)

class WafRegionalStack(core.Stack):

  def make_rules(self, list_of_rules={}):
    rules = list()
    for r in list_of_rules:
      rule = wafv2.CfnWebACL.RuleProperty(
        name             = r["name"],
        priority         = r["priority"],
        override_action  = wafv2.CfnWebACL.OverrideActionProperty(none={}),
        statement        = wafv2.CfnWebACL.StatementProperty(
          managed_rule_group_statement = wafv2.CfnWebACL.ManagedRuleGroupStatementProperty(
            name           = r["name"],
            vendor_name    = "AWS",
            excluded_rules = []
          ) ## managed_rule_group_statement
        ), ## statement
        visibility_config=wafv2.CfnWebACL.VisibilityConfigProperty(
          cloud_watch_metrics_enabled = True, 
          metric_name                 = r["name"], 
          sampled_requests_enabled    = True
        ) ## visibility_config
      ) ## wafv2.CfnWebACL.RuleProperty
      rules.append(rule)
    return rules



  def __init__(self, scope: core.Construct, id: str, **kwargs) -> None:
    super().__init__(scope, id, **kwargs)

    ##
    ## List available Managed Rule Groups using AWS CLI
    ## aws wafv2 list-available-managed-rule-groups --scope REGIONAL
    ##
    managed_rules = [{
      "name"            : "AWSManagedRulesCommonRuleSet",
      "priority"        : 10,
      "override_action" : "none",
      "excluded_rules"  : [],
    },{
      "name"            : "AWSManagedRulesAmazonIpReputationList",
      "priority"        : 20,
      "override_action" : "none",
      "excluded_rules"  : [],
    },{
      "name"            : "AWSManagedRulesKnownBadInputsRuleSet",
      "priority"        : 30,
      "override_action" : "none",
      "excluded_rules"  : [],
    },{
      "name"            : "AWSManagedRulesSQLiRuleSet",
      "priority"        : 40,
      "override_action" : "none",
      "excluded_rules"  : [],
    },{
      "name"            : "AWSManagedRulesLinuxRuleSet",
      "priority"        : 50,
      "override_action" : "none",
      "excluded_rules"  : [],
    },{
      "name"            : "AWSManagedRulesUnixRuleSet",
      "priority"        : 60,
      "override_action" : "none",
      "excluded_rules"  : [],
    }]


    #############################################################
    ##
    ## WAF - Regional, for use in Load Balancers
    ##
    #############################################################

    wafacl = wafv2.CfnWebACL(self, id="WAF",
      default_action=wafv2.CfnWebACL.DefaultActionProperty(allow={}, block=None),
      ##
      ## The scope of this Web ACL.
      ## Valid options: CLOUDFRONT, REGIONAL.
      ## For CLOUDFRONT, you must create your WAFv2 resources 
      ## in the US East (N. Virginia) Region, us-east-1
      ## https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-wafv2-webacl.html#cfn-wafv2-webacl-scope
      ##
      scope="REGIONAL", 
      ##
      ## Defines and enables Amazon CloudWatch metrics and web request sample collection. 
      ##
      visibility_config=wafv2.CfnWebACL.VisibilityConfigProperty(
        cloud_watch_metrics_enabled=True, 
        metric_name                ="waf-regional", 
        sampled_requests_enabled   =True
      ),
      description = "WAFv2 ACL for Regional", 
      name        = "waf-regional", 
      rules       = self.make_rules(managed_rules),
    ) ## wafv2.CfnWebACL

    core.Tags.of(wafacl).add("Name",      "waf-regional",     priority=300)
    core.Tags.of(wafacl).add("Purpose",   "WAF for Regional", priority=300)
    core.Tags.of(wafacl).add("CreatedBy", "Cloudformation",   priority=300)


    core.CfnOutput(self, "WafAclArn", export_name="WafRegionalStack:WafAclRegionalArn", value=wafacl.attr_arn)













