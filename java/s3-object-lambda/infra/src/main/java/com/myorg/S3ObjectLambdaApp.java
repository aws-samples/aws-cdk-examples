package com.myorg;

import software.amazon.awscdk.App;
import software.amazon.awscdk.StackProps;

public class S3ObjectLambdaApp extends App {

  public static void main(final String... args) {
    var app = new S3ObjectLambdaApp();
    var stackProps = StackProps.builder().build();
    app.createStack(stackProps);
    app.synth();
  }

  public S3ObjectLambdaStack createStack(StackProps stackProps) {
    return new S3ObjectLambdaStack(this, "S3ObjectLambdaStack", stackProps);
  }

}

