package com.amazonaws.cdk.examples;

import java.util.Map;
import org.junit.jupiter.api.Test;
import software.amazon.awscdk.App;
import software.amazon.awscdk.assertions.Match;
import software.amazon.awscdk.assertions.Template;

public class EksPrivateClusterStackTest {
  private static Template synthesizeTemplate() {
    final App app = new App();
    final EksPrivateClusterStack stack = new EksPrivateClusterStack(app, "EksPrivateCluster");
    return Template.fromStack(stack);
  }

  @Test
  public void testEksClusterNameVersion() {
    final Template template = synthesizeTemplate();
    template.resourcePropertiesCountIs(
        "Custom::AWSCDK-EKS-Cluster",
        Match.objectLike(
            Map.of(
                "Config",
                Map.of(
                    "name", "eks-private",
                    "version", "1.34"))),
        1);
  }

  @Test
  public void testEksClusterEndpointAccess() {
    final Template template = synthesizeTemplate();
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
    final Template template = synthesizeTemplate();
    template.resourceCountIs("AWS::EC2::InternetGateway", 0);
  }

  @Test
  public void testNoNatGateway() {
    final Template template = synthesizeTemplate();
    template.resourceCountIs("AWS::EC2::NatGateway", 0);
  }
}
