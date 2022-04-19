package software.amazon.awscdk.examples;

import software.amazon.awscdk.App;

public class LambdaCronApp {
  public static void main(final String[] args) {
    App app = new App();

    new LambdaCronStack(app, "cdk-lambda-cron-example");

    app.synth();
  }
}
