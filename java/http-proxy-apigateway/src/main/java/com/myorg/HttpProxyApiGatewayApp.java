package com.myorg;

import software.amazon.awscdk.App;
import software.amazon.awscdk.StackProps;

public class HttpProxyApiGatewayApp {
  public static void main(final String[] args) {
    var app = new App();
    var stackProps = StackProps.builder()
      .stackName("HttpProxyApiGatewayStack")
      .build();
    new HttpProxyApiGatewayStack(app, "HttpProxyApiGatewayStack", stackProps);
    app.synth();
  }
}
