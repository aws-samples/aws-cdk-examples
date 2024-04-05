package com.amazonaws.cdk.examples;

import software.amazon.awscdk.App;

public class PrivateClusterCdkApp {
  public static void main(final String[] args) {
    App app = new App();

    new EksPrivateClusterStack(app, "EksPrivateCluster");

    app.synth();
  }
}
