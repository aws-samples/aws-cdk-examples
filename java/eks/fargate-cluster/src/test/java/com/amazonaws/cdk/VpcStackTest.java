package com.amazonaws.cdk;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import software.amazon.awscdk.App;
import software.amazon.awscdk.assertions.Match;
import software.amazon.awscdk.assertions.Template;

import java.util.Map;

class VpcStackTest {

  private static Template template;

  @BeforeAll
  static void setup() {
    final App app = new App();
    final VpcStack vpcStack = new VpcStack(app, "VpcStack");
    template = Template.fromStack(vpcStack);
  }

  @Test
  void testVpc() {
    template.hasResourceProperties("AWS::EC2::VPC", Match.objectLike(
      Map.of(
        "CidrBlock", "10.0.0.0/16",
        "EnableDnsHostnames", true,
        "EnableDnsSupport", true
      )
    ));
  }

  @Test
  void testPublicSubnets() {
    template.resourcePropertiesCountIs("AWS::EC2::Subnet", Match.objectLike(
      Map.of(
        "MapPublicIpOnLaunch", true
      )
    ), 2);
  }

  @Test
  void testPrivateSubnets() {
    template.resourcePropertiesCountIs("AWS::EC2::Subnet", Match.objectLike(
      Map.of(
        "MapPublicIpOnLaunch", false
      )
    ), 2);
  }

  @Test
  void testInternetGateway() {
    template.resourceCountIs("AWS::EC2::InternetGateway", 1);
  }

  @Test
  void testNatGateway() {
    template.resourceCountIs("AWS::EC2::NatGateway", 1);
  }
}
