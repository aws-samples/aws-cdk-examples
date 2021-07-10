
import * as cdk                from '@aws-cdk/core';
import * as wafv2              from '@aws-cdk/aws-wafv2';

type listOfRules = {
  name           : string;
  priority       : number;
  overrideAction : string;
  excludedRules  : string[];
};

export class WafRegionalStack extends cdk.Stack {

  //
  // Take in list of rules
  // Create output for use in WAF config
  //
  protected makeRules(listOfRules:listOfRules[]=[]) {
    var rules:wafv2.CfnRuleGroup.RuleProperty[] = [];
    listOfRules.forEach(function(r){
      var mrgsp:wafv2.CfnWebACL.ManagedRuleGroupStatementProperty = {
              name:       r['name'],
              vendorName: "AWS",
            };

      var stateProp:wafv2.CfnWebACL.StatementProperty = {
        managedRuleGroupStatement: {
              name:       r['name'],
              vendorName: "AWS",
            }
      };

      var rule:wafv2.CfnRuleGroup.RuleProperty = {
          name:           r['name'],
          priority:       r['priority'],
          statement: stateProp,
          visibilityConfig: {
            sampledRequestsEnabled:   true,
            cloudWatchMetricsEnabled: true,
            metricName:               r['name']
          },
        };
      rules.push(rule);
    }); // forEach
    return rules;
  } // function makeRules


  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //
    // List available Managed Rule Groups using AWS CLI
    // aws wafv2 list-available-managed-rule-groups --scope REGIONAL
    //
    const managedRules:listOfRules[] = [{
      "name"            : "AWSManagedRulesCommonRuleSet",
      "priority"        : 10,
      "overrideAction"  : "none",
      "excludedRules"   : []
    },{
      "name"            : "AWSManagedRulesAmazonIpReputationList",
      "priority"        : 20,
      "overrideAction"  : "none",
      "excludedRules"   : []
    },{
      "name"            : "AWSManagedRulesKnownBadInputsRuleSet",
      "priority"        : 30,
      "overrideAction"  : "none",
      "excludedRules"   : []
    },{
      "name"            : "AWSManagedRulesAnonymousIpList",
      "priority"        : 40,
      "overrideAction"  : "none",
      "excludedRules"   : []
    },{
      "name"            : "AWSManagedRulesLinuxRuleSet",
      "priority"        : 50,
      "overrideAction"  : "none",
      "excludedRules"   : []
    },{
      "name"            : "AWSManagedRulesUnixRuleSet",
      "priority"        : 60,
      "overrideAction"  : "none",
      "excludedRules"   : [],
    }];


    ////////////////////////////////////////////////////////////#
    //
    // WAF - Regional, for use in Load Balancers
    //
    ////////////////////////////////////////////////////////////#

    const wafAclRegional = new wafv2.CfnWebACL(this, "WafRegional", {
      defaultAction: { allow: {} },
      //
      // The scope of this Web ACL.
      // Valid options: CLOUDFRONT, REGIONAL.
      // For CLOUDFRONT, you must create your WAFv2 resources 
      // in the US East (N. Virginia) Region, us-east-1
      //
      scope: "REGIONAL", 
      //
      // Defines and enables Amazon CloudWatch metrics and web request sample collection. 
      //
      visibilityConfig: {
        cloudWatchMetricsEnabled: true, 
        metricName:               "waf-regional", 
        sampledRequestsEnabled:   true
      },
      description:  "WAFv2 ACL for Regional",
      name:         "waf-regional", 
      rules: this.makeRules(managedRules),
    }); // wafv2.CfnWebACL

    cdk.Tags.of(wafAclRegional).add("Name",      "waf-Regional",   {"priority":300});
    cdk.Tags.of(wafAclRegional).add("Purpose",   "WAF Regional",   {"priority":300});
    cdk.Tags.of(wafAclRegional).add("CreatedBy", "CloudFormation", {"priority":300});

    new cdk.CfnOutput(this, "wafAclRegionalArn", {
      value: wafAclRegional.attrArn,
      description: " WAF Regional arn",
      exportName: "WafRegionalStack:WafAclRegionalArn"
    });


  } // constructor

} // class

