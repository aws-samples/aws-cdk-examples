package software.amazon.awscdk.examples;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import software.amazon.awscdk.CfnOutput;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.TagProps;
import software.amazon.awscdk.Tags;
import software.amazon.awscdk.services.wafv2.CfnWebACL;
import software.amazon.awscdk.services.wafv2.CfnWebACL.AllowActionProperty;
import software.amazon.awscdk.services.wafv2.CfnWebACL.BlockActionProperty;
import software.amazon.awscdk.services.wafv2.CfnWebACL.DefaultActionProperty;
import software.amazon.awscdk.services.wafv2.CfnWebACL.GeoMatchStatementProperty;
import software.amazon.awscdk.services.wafv2.CfnWebACL.ManagedRuleGroupStatementProperty;
import software.amazon.awscdk.services.wafv2.CfnWebACL.NotStatementProperty;
import software.amazon.awscdk.services.wafv2.CfnWebACL.OverrideActionProperty;
import software.amazon.awscdk.services.wafv2.CfnWebACL.RateBasedStatementProperty;
import software.amazon.awscdk.services.wafv2.CfnWebACL.RuleActionProperty;
import software.amazon.awscdk.services.wafv2.CfnWebACL.RuleProperty;
import software.amazon.awscdk.services.wafv2.CfnWebACL.StatementProperty;
import software.amazon.awscdk.services.wafv2.CfnWebACL.VisibilityConfigProperty;
import software.constructs.Construct;

/** WAF Regional CDK example for Java! */
class WAFRegionalStack extends Stack {
  public WAFRegionalStack(final Construct parent, final String name) {

    super(parent, name, null);

    List<Map<String, String>> managedRules = new ArrayList<Map<String, String>>();

    Map<String, String> managedRule1 = new HashMap<String, String>();
    managedRule1.put("name", "AWSManagedRulesCommonRuleSet");
    managedRule1.put("priority", "10");
    managedRules.add(managedRule1);

    Map<String, String> managedRule2 = new HashMap<String, String>();
    managedRule2.put("name", "AWSManagedRulesAmazonIpReputationList");
    managedRule2.put("priority", "20");
    managedRules.add(managedRule2);

    Map<String, String> managedRule3 = new HashMap<String, String>();
    managedRule3.put("name", "AWSManagedRulesKnownBadInputsRuleSet");
    managedRule3.put("priority", "30");
    managedRules.add(managedRule3);

    Map<String, String> managedRule4 = new HashMap<String, String>();
    managedRule4.put("name", "AWSManagedRulesSQLiRuleSet");
    managedRule4.put("priority", "40");
    managedRules.add(managedRule4);

    Map<String, String> managedRule5 = new HashMap<String, String>();
    managedRule5.put("name", "AWSManagedRulesLinuxRuleSet");
    managedRule5.put("priority", "50");
    managedRules.add(managedRule5);

    Map<String, String> managedRule6 = new HashMap<String, String>();
    managedRule6.put("name", "AWSManagedRulesUnixRuleSet");
    managedRule6.put("priority", "60");
    managedRules.add(managedRule6);

    CfnWebACL cfnWebACL =
        CfnWebACL.Builder.create(this, "WafRegional")
            .defaultAction(
                DefaultActionProperty.builder()
                    .allow(AllowActionProperty.builder().build())
                    .build())
            .scope("REGIONAL")
            .visibilityConfig(
                VisibilityConfigProperty.builder()
                    .cloudWatchMetricsEnabled(true)
                    .metricName("waf-regional")
                    .sampledRequestsEnabled(true)
                    .build())
            .description("WAFv2 ACL for Regional")
            .name("waf-regional")
            .rules(makeRules(managedRules))
            .build();

    Tags.of(cfnWebACL).add("Name", "waf-Regional", TagProps.builder().priority(300).build());
    Tags.of(cfnWebACL).add("Purpose", "WAF Regional", TagProps.builder().priority(300).build());
    Tags.of(cfnWebACL).add("CreatedBy", "CloudFormation", TagProps.builder().priority(300).build());

    CfnOutput.Builder.create(this, "wafAclRegionalArn")
        .description("WAF Regional arn")
        .value(cfnWebACL.getAttrArn())
        .exportName("WafRegionalStack:WafAclRegionalArn")
        .build();
  }

  protected List<RuleProperty> makeRules(List<Map<String, String>> rules) {
    List<RuleProperty> ruleList = new ArrayList<RuleProperty>();
    for (Map<String, String> singleRule : rules) {
      ruleList.add(
          RuleProperty.builder()
              .name(singleRule.get("name"))
              .priority(Integer.parseInt(singleRule.get("priority")))
              .overrideAction(
                  OverrideActionProperty.builder().none(new HashMap<String, Object>()).build())
              .statement(
                  StatementProperty.builder()
                      .managedRuleGroupStatement(
                          ManagedRuleGroupStatementProperty.builder()
                              .name(singleRule.get("name"))
                              .vendorName("AWS")
                              .build())
                      .build())
              .visibilityConfig(
                  VisibilityConfigProperty.builder()
                      .cloudWatchMetricsEnabled(true)
                      .metricName(singleRule.get("name"))
                      .sampledRequestsEnabled(true)
                      .build())
              .build());
    }

    ruleList.add(
        RuleProperty.builder()
            .name("GeoMatch")
            .priority(0)
            .action(
                RuleActionProperty.builder().block(BlockActionProperty.builder().build()).build())
            .statement(
                StatementProperty.builder()
                    .notStatement(
                        NotStatementProperty.builder()
                            .statement(
                                StatementProperty.builder()
                                    .geoMatchStatement(
                                        GeoMatchStatementProperty.builder()
                                            .countryCodes(
                                                List.of(
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
                                                    "VE")) // Venezuela
                                            .build())
                                    .build())
                            .build())
                    .build())
            .visibilityConfig(
                VisibilityConfigProperty.builder()
                    .cloudWatchMetricsEnabled(true)
                    .metricName("GeoMatch")
                    .sampledRequestsEnabled(true)
                    .build())
            .build());

    ruleList.add(
        RuleProperty.builder()
            .name("LimitRequests100")
            .priority(1)
            .action(
                RuleActionProperty.builder().block(BlockActionProperty.builder().build()).build())
            .statement(
                StatementProperty.builder()
                    .rateBasedStatement(
                        RateBasedStatementProperty.builder()
                            .aggregateKeyType("IP")
                            .limit(100)
                            .build())
                    .build())
            .visibilityConfig(
                VisibilityConfigProperty.builder()
                    .cloudWatchMetricsEnabled(true)
                    .metricName("LimitRequests100")
                    .sampledRequestsEnabled(true)
                    .build())
            .build());
    return ruleList;
  }
}