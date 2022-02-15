package software.amazon.awscdk.examples;

import software.amazon.awscdk.App;

public class CustomResourceApp {
  public static void main(final String args[]) {
    App app = new App();

    new CustomResourceStack(app, "cdk-custom-resource-example2");

    app.synth();
  }
}
