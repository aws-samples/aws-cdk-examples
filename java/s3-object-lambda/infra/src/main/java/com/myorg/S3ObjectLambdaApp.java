package com.myorg;

import software.amazon.awscdk.App;
import software.amazon.awscdk.StackProps;

/**
 * Main CDK application class that serves as the entry point for deploying the S3 Object Lambda infrastructure.
 */
public class S3ObjectLambdaApp extends App {

  public static void main(final String... args) {
    var app = new S3ObjectLambdaApp();
    var stackProps = StackProps.builder().build();
    app.createStack(stackProps);
    app.synth();
  }

  /**
   * Creates a new instance of the S3ObjectLambdaStack with the specified properties.
   */
  public S3ObjectLambdaStack createStack(StackProps stackProps) {
    return new S3ObjectLambdaStack(this, "S3ObjectLambdaStack", stackProps);
  }

}

