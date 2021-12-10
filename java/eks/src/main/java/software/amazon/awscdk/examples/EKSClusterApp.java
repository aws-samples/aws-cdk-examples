package software.amazon.awscdk.examples;

import software.amazon.awscdk.App;

public class EKSClusterApp {
  public static void main(final String[] args) {
    App app = new App();
    new EKSCluster(app, "MyEKSCluster");
    app.synth();
  }
}
