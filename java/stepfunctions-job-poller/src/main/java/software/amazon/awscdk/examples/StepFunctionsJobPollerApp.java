package software.amazon.awscdk.examples;

import software.amazon.awscdk.App;

public class StepFunctionsJobPollerApp {
  public static void main(final String args[]) {
    App app = new App();

    new StepFunctionsJobPollerStack(app, "cdk-stepfunctions-jobpoller-example");

    app.synth();
  }
}
