package software.amazon.awscdk.examples;

import software.amazon.awscdk.App;

public class MyWidgetServiceApp {
  public static void main(final String argv[]) {
    App app = new App();

    new MyWidgetServiceStack(app, "MyWidgetServiceStack");

    app.synth();
  }
}
