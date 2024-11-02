package com.myorg;

import software.amazon.awscdk.App;
import software.amazon.awscdk.StackProps;

public class CognitoApiLambdaApp {
  public static void main(final String... args) {
    App app = new App();
    StackProps stackProps = StackProps.builder().build();
    new CognitoApiLambdaStack(app, "CognitoApiLambdaStack", stackProps);
    app.synth();
  }
}

