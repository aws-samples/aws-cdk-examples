package com.amazonaws.cdk.examples;

import java.util.Map;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import software.amazon.awscdk.App;
import software.amazon.awscdk.assertions.Match;
import software.amazon.awscdk.assertions.Template;

public class EksPrivateClusterStackTest {
  private static Template template;

  @BeforeAll
  static void setUp() {
    final App app = new App();
    final EksPrivateClusterStack stack = new EksPrivateClusterStack(app, "EksPrivateCluster");
    template = Template.fromStack(stack);
  }

  @Test
  public void testEksClusterNameVersion() {
    final App app = new App();
    final EksPrivateClusterStack stack = new EksPrivateClusterStack(app, "EksPrivateCluster");
    template = Template.fromStack(stack);
    template.resourcePropertiesCountIs(
        "Custom::AWSCDK-EKS-Cluster",
        Match.objectLike(
            Map.of(
                "Config",
                Map.of(
                    "name", "eks-private",
                    "version", "1.31"))),
        1);
  }

  @Test
  public void testEksClusterEndpointAccess() {
    final App app = new App();
    final EksPrivateClusterStack stack = new EksPrivateClusterStack(app, "EksPrivateCluster");
    template = Template.fromStack(stack);
    template.resourcePropertiesCountIs(
        "Custom::AWSCDK-EKS-Cluster",
        Match.objectLike(
            Map.of(
                "Config",
                Map.of(
                    "resourcesVpcConfig",
                    Map.of(
                        "endpointPublicAccess", false,
                        "endpointPrivateAccess", true)))),
        1);
  }

  @Test
  public void testNoInternetGateway() {
    template.resourceCountIs("AWS::EC2::InternetGateway", 0);
  }

  @Test
  public void testNoNatGateway() {
    template.resourceCountIs("AWS::EC2::NatGateway", 0);
  }
}
