
import * as cdk from 'aws-cdk-lib';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

type listOfRules = {
  name: string;
  priority: number;
  overrideAction: string;
  excludedRules: string[];
};

export class WafCloudFrontStack extends cdk.Stack {

  /**
   * Take in list of rules
   * Create output for use in WAF config
   */
  protected makeRules(listOfRules: listOfRules[] = []) {
    var rules: wafv2.CfnRuleGroup.RuleProperty[] = [];
    listOfRules.forEach(function (r) {
      var mrgsp: wafv2.CfnWebACL.ManagedRuleGroupStatementProperty = {
        name: r['name'],
        vendorName: "AWS",
        excludedRules: []
      };

      var stateProp: wafv2.CfnWebACL.StatementProperty = {
        managedRuleGroupStatement: {
          name: r['name'],
          vendorName: "AWS",
        }
      };
      var overrideAction: wafv2.CfnWebACL.OverrideActionProperty = { none: {} }

      var rule: wafv2.CfnWebACL.RuleProperty = {
        name: r['name'],
        priority: r['priority'],
        overrideAction: overrideAction,
        statement: stateProp,
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: r['name']
        },
      };
      rules.push(rule);
    }); // forEach

    // Allowed country list
    var ruleGeoMatch: wafv2.CfnWebACL.RuleProperty = {
      name: 'GeoMatch',
      priority: 0,
      action: {
        block: {} // To disable, change to *count*
      },
      statement: {
        notStatement: {
          statement: {
            geoMatchStatement: {
              // block connection if source not in the below country list
              countryCodes: [
                "AR", // Argentina
                "BO", // Bolivia
                "BR", // Brazil
                "CL", // Chile
                "CO", // Colombia
                "EC", // Ecuador
                "FK", // Falkland Islands
                "GF", // French Guiana
                "GY", // Guiana
                "GY", // Guyana
                "PY", // Paraguay
                "PE", // Peru
                "SR", // Suriname
                "UY", // Uruguay
                "VE", // Venezuela
              ]
            }
          }
        }
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'GeoMatch'
      }
    }; // GeoMatch
    rules.push(ruleGeoMatch);

    /**
     * The rate limit is the maximum number of requests from a
     * single IP address that are allowed in a five-minute period.
     * This value is continually evaluated,
     * and requests will be blocked once this limit is reached.
     * The IP address is automatically unblocked after it falls below the limit.
     */
    var ruleLimitRequests100: wafv2.CfnWebACL.RuleProperty = {
      name: 'LimitRequests100',
      priority: 1,
      action: {
        block: {} // To disable, change to *count*
      },
      statement: {
        rateBasedStatement: {
          limit: 100,
          aggregateKeyType: "IP"
        }
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'LimitRequests100'
      }
    }; // limit requests to 100
    rules.push(ruleLimitRequests100);

    return rules;
  } // function makeRules


  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /**
     * List available Managed Rule Groups using AWS CLI
     * aws wafv2 list-available-managed-rule-groups --scope CLOUDFRONT
     */
    const managedRules: listOfRules[] = [{
      "name": "AWSManagedRulesCommonRuleSet",
      "priority": 10,
      "overrideAction": "none",
      "excludedRules": []
    }, {
      "name": "AWSManagedRulesAmazonIpReputationList",
      "priority": 20,
      "overrideAction": "none",
      "excludedRules": []
    }, {
      "name": "AWSManagedRulesKnownBadInputsRuleSet",
      "priority": 30,
      "overrideAction": "none",
      "excludedRules": []
    }, {
      "name": "AWSManagedRulesAnonymousIpList",
      "priority": 40,
      "overrideAction": "none",
      "excludedRules": []
    }, {
      "name": "AWSManagedRulesLinuxRuleSet",
      "priority": 50,
      "overrideAction": "none",
      "excludedRules": []
    }, {
      "name": "AWSManagedRulesUnixRuleSet",
      "priority": 60,
      "overrideAction": "none",
      "excludedRules": [],
    }];

    // WAF - CloudFront

    const wafAclCloudFront = new wafv2.CfnWebACL(this, "WafCloudFront", {
      defaultAction: { allow: {} },
      /**
       * The scope of this Web ACL.
       * Valid options: CLOUDFRONT, REGIONAL.
       * For CLOUDFRONT, you must create your WAFv2 resources
       * in the US East (N. Virginia) Region, us-east-1
       */
      scope: "CLOUDFRONT",
      // Defines and enables Amazon CloudWatch metrics and web request sample collection.
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: "waf-cloudfront",
        sampledRequestsEnabled: true
      },
      description: "WAFv2 ACL for CloudFront",
      name: "waf-cloudfront",
      rules: this.makeRules(managedRules),
    }); // wafv2.CfnWebACL

    cdk.Tags.of(wafAclCloudFront).add("Name", "waf-cloudfront", { "priority": 300 });
    cdk.Tags.of(wafAclCloudFront).add("Purpose", "CloudFront", { "priority": 300 });
    cdk.Tags.of(wafAclCloudFront).add("CreatedBy", "CloudFormation", { "priority": 300 });

    new cdk.CfnOutput(this, "wafAclCloudFrontArn", {
      value: wafAclCloudFront.attrArn,
      description: " WAF CloudFront arn",
      exportName: "WafCloudFrontStack:WafAclCloudFrontArn"
    });
  } // constructor
} // class
