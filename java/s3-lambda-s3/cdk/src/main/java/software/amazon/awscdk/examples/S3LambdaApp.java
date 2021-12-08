package software.amazon.awscdk.examples;

import software.amazon.awscdk.App;

public class S3LambdaApp {
  public static void main(final String[] args) {
    App app = new App();

    new S3LambdaStack(app, "s3-lambda");

    app.synth();
  }
}
