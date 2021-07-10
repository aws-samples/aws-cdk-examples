
import * as cdk                from '@aws-cdk/core';
import * as wafv2              from '@aws-cdk/aws-wafv2';

type listOfRules = {
  name           : string;
  priority       : number;
  overrideAction : string;
  excludedRules  : string[];
};

export class WafCloudFrontStack extends cdk.Stack {

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
    // aws wafv2 list-available-managed-rule-groups --scope CLOUDFRONT
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
    // WAF - CloudFront
    //
    ////////////////////////////////////////////////////////////#

    const wafAclCloudFront = new wafv2.CfnWebACL(this, "WafCloudFront", {
      defaultAction: { allow: {} },
      //
      // The scope of this Web ACL.
      // Valid options: CLOUDFRONT, REGIONAL.
      // For CLOUDFRONT, you must create your WAFv2 resources 
      // in the US East (N. Virginia) Region, us-east-1
      //
      scope: "CLOUDFRONT", 
      //
      // Defines and enables Amazon CloudWatch metrics and web request sample collection. 
      //
      visibilityConfig: {
        cloudWatchMetricsEnabled: true, 
        metricName:               "waf-cloudfront", 
        sampledRequestsEnabled:   true
      },
      description:  "WAFv2 ACL for CloudFront",
      name:         "waf-cloudfront", 
      rules: this.makeRules(managedRules),
    }); // wafv2.CfnWebACL

    cdk.Tags.of(wafAclCloudFront).add("Name",      "waf-cloudfront", {"priority":300});
    cdk.Tags.of(wafAclCloudFront).add("Purpose",   "CloudFront",     {"priority":300});
    cdk.Tags.of(wafAclCloudFront).add("CreatedBy", "CloudFormation", {"priority":300});

    new cdk.CfnOutput(this, "wafAclCloudFrontArn", {
      value: wafAclCloudFront.attrArn,
      description: " WAF CloudFront arn",
      exportName: "WafCloudFrontStack:WafAclCloudFrontArn"
    });

  } // constructor

} // class
