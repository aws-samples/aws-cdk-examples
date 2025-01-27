package com.amazonaws.cdk;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import software.amazon.awscdk.App;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.assertions.Match;
import software.amazon.awscdk.assertions.Template;
import software.amazon.awscdk.services.ec2.Vpc;

import java.util.List;
import java.util.Map;

class EksFargateStackTest {
  private static Template template;

  @BeforeAll
  static void setup() {
    final software.amazon.awscdk.App app = new App();
    final Stack stack = new Stack(app, "testStack");
    final Vpc vpc = new Vpc(stack, "vpc");

    final EksFargateStack eksFargateStack = new EksFargateStack(app, "EksFargateStack", EksFargateProps.builder()
      .vpc(vpc)
      .build());

    template = Template.fromStack(eksFargateStack);
  }

  @Test
  void testIamRoles() {
    template.resourcePropertiesCountIs("AWS::IAM::Role", Match.objectLike(
      Map.of(
        "RoleName", "EksClusterAdminRole",
        "ManagedPolicyArns", List.of(
          "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
          "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
        )
      )
    ), 1);

    template.resourcePropertiesCountIs("AWS::IAM::Role", Match.objectLike(
      Map.of(
        "RoleName", "EksClusterAppRole",
        "ManagedPolicyArns", List.of(
          "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
          "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
        )
      )
    ), 1);
  }

  @Test
  void testEksCluster() {
    template.resourcePropertiesCountIs("Custom::AWSCDK-EKS-Cluster", Match.objectLike(
      Map.of(
        "Config", Map.of(
          "name", "SampleCluster",
          "version", "1.31"
        )
      )
    ), 1);
  }

  @Test
  void testFargateProfiles() {
    template.resourcePropertiesCountIs("Custom::AWSCDK-EKS-FargateProfile", Match.objectLike(
      Map.of(
        "Config", Map.of(
          "fargateProfileName", "app-profile",
          "selectors", List.of(Map.of("namespace", "app-*"))
        )
      )
    ), 1);

    template.resourcePropertiesCountIs("Custom::AWSCDK-EKS-FargateProfile", Match.objectLike(
      Map.of(
        "Config", Map.of(
          "selectors", List.of(
            Map.of("namespace", "default"),
            Map.of("namespace", "kube-system")
          )
        )
      )
    ), 1);
  }

  @Test
  void testEksClusterAddons() {
    template.resourcePropertiesCountIs("AWS::EKS::Addon", Match.objectLike(Map.of("AddonName", "vpc-cni")), 1);
    template.resourcePropertiesCountIs("AWS::EKS::Addon", Match.objectLike(Map.of("AddonName", "kube-proxy")), 1);
    template.resourcePropertiesCountIs("Custom::AWSCDK-EKS-KubernetesPatch", Match.objectLike(
      Map.of(
        "ResourceName", "deployment/coredns",
        "ResourceNamespace", "kube-system"
      )
    ), 1);
  }

}
