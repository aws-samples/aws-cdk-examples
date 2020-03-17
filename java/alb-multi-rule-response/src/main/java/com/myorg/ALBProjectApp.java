package com.myorg;

import software.amazon.awscdk.core.App;
import software.amazon.awscdk.core.Environment;
import software.amazon.awscdk.core.StackProps;

public class ALBProjectApp {
  public static void main(final String[] args) {
    App app = new App();

    new ALBProjectStack(
        app, "ALBProjectStack", StackProps.builder().env(Environment.builder().build()).build());
    app.synth();
  }
}
