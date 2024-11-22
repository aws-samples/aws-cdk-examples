package com.myorg;

import software.amazon.awscdk.App;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.apigatewayv2.HttpMethod;

import java.util.List;

import static com.myorg.HttpProxyApiGatewayStack.*;

public class HttpProxyApiGatewayApp {
  public static void main(final String[] args) {
    var app = new App();
    new HttpProxyApiGatewayStack(
      app,
      "HttpProxyApiGatewayStack",
      StackProps.builder()
        .stackName("HttpProxyApiGatewayStack")
        .build(),
      List.of(
        // Replace with resources corresponding to your own HTTP backend APIs if you want to.
        // Add more resources if you need to.
        new ProxyResourceParameters("PetStore", "http://petstore-demo-endpoint.execute-api.com", HttpMethod.ANY.name(), "/petstore/pets?type=fish"),
        new ProxyResourceParameters("OpenTrivia", "https://opentdb.com", HttpMethod.ANY.name(), "/api.php?amount=10")
      )
    );
    app.synth();
  }
}
