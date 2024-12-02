package com.myorg;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import software.amazon.awscdk.App;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.assertions.Template;

public class ApplicationLoadBalancerTest {

  private static Template template;

  @BeforeAll
  public static void setUp() {
    var app = new App();
    var stackProps = StackProps.builder().build();
    var stack = new ApplicationLoadBalancerStack(app, "ApplicationLoadBalancerStack", stackProps);
    template = Template.fromStack(stack);
  }

  @Test
  @DisplayName("Test if number of VPCs in the stack is equal to the expected value.")
  public void testVPCsCount() {
    template.resourceCountIs("AWS::EC2::VPC", 1);
  }

  @Test
  @DisplayName("Test if number of subnets in the stack is equal to the expected value.")
  public void testSubnetsCount() {
    template.resourceCountIs("AWS::EC2::Subnet", 4);
  }

  @Test
  @DisplayName("Test if number of route tables in the stack is equal to the expected value.")
  public void testRouteTablesCount() {
    template.resourceCountIs("AWS::EC2::RouteTable", 4);
  }

  @Test
  @DisplayName("Test if number of subnet route table associations in the stack is equal to the expected value.")
  public void testSubnetRouteTableAssociationsCount() {
    template.resourceCountIs("AWS::EC2::SubnetRouteTableAssociation", 4);
  }

  @Test
  @DisplayName("Test if number of routes in the stack is equal to the expected value.")
  public void testRoutesCount() {
    template.resourceCountIs("AWS::EC2::Route", 4);
  }

  @Test
  @DisplayName("Test if number of EIPs in the stack is equal to the expected value.")
  public void testEIPsCount() {
    template.resourceCountIs("AWS::EC2::EIP", 2);
  }

  @Test
  @DisplayName("Test if number of NAT gateways in the stack is equal to the expected value.")
  public void testNatGatewaysCount() {
    template.resourceCountIs("AWS::EC2::NatGateway", 2);
  }

  @Test
  @DisplayName("Test if number of Internet gateways in the stack is equal to the expected value.")
  public void testInternetGatewaysCount() {
    template.resourceCountIs("AWS::EC2::InternetGateway", 1);
  }

  @Test
  @DisplayName("Test if number of VPC gateway attachments in the stack is equal to the expected value.")
  public void testVPCGatewayAttachmentsCount() {
    template.resourceCountIs("AWS::EC2::VPCGatewayAttachment", 1);
  }

  @Test
  @DisplayName("Test if number of security groups in the stack is equal to the expected value.")
  public void testSecurityGroupsCount() {
    template.resourceCountIs("AWS::EC2::SecurityGroup", 2);
  }

  @Test
  @DisplayName("Test if number of security group ingress resources in the stack is equal to the expected value.")
  public void testSecurityGroupIngressResourcesCount() {
    template.resourceCountIs("AWS::EC2::SecurityGroupIngress", 1);
  }

  @Test
  @DisplayName("Test if number of roles in the stack is equal to the expected value.")
  public void testRolesCount() {
    template.resourceCountIs("AWS::IAM::Role", 1);
  }

  @Test
  @DisplayName("Test if number of IAM instance profiles in the stack is equal to the expected value.")
  public void testIAMInstanceProfilesCount() {
    template.resourceCountIs("AWS::IAM::InstanceProfile", 1);
  }

  @Test
  @DisplayName("Test if number of launch configurations in the stack is equal to the expected value.")
  public void testLaunchConfigurationsCount() {
    template.resourceCountIs("AWS::AutoScaling::LaunchConfiguration", 1);
  }

  @Test
  @DisplayName("Test if number of auto scaling groups in the stack is equal to the expected value.")
  public void testAutoScalingGroupsCount() {
    template.resourceCountIs("AWS::AutoScaling::AutoScalingGroup", 1);
  }

  @Test
  @DisplayName("Test if number of scaling policies in the stack is equal to the expected value.")
  public void testScalingPoliciesCount() {
    template.resourceCountIs("AWS::AutoScaling::ScalingPolicy", 1);
  }

  @Test
  @DisplayName("Test if number of load balancers in the stack is equal to the expected value.")
  public void testLoadBalancersCount() {
    template.resourceCountIs("AWS::ElasticLoadBalancingV2::LoadBalancer", 1);
  }

  @Test
  @DisplayName("Test if number of security group egress resources in the stack is equal to the expected value.")
  public void testSecurityGroupEgressResourcesCount() {
    template.resourceCountIs("AWS::EC2::SecurityGroupEgress", 1);
  }

  @Test
  @DisplayName("Test if number of load balancer listeners in the stack is equal to the expected value.")
  public void testLoadBalancerListenersCount() {
    template.resourceCountIs("AWS::ElasticLoadBalancingV2::Listener", 1);
  }

  @Test
  @DisplayName("Test if number of load balancer target groups in the stack is equal to the expected value.")
  public void testLoadBalancerTargetGroupsCount() {
    template.resourceCountIs("AWS::ElasticLoadBalancingV2::TargetGroup", 1);
  }

}
