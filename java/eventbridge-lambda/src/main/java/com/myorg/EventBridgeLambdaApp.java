package com.myorg;

import software.amazon.awscdk.App;
import software.amazon.awscdk.StackProps;

public class EventBridgeLambdaApp {
  public static void main(final String... args) {
    App app = new App();
    StackProps stackProps = StackProps.builder().build();
    new EventBridgeLambdaStack(app, "EventBridgeLambdaStack", stackProps);
    app.synth();
  }
}
