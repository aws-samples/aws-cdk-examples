package com.myorg;

import software.amazon.awscdk.App;
import software.amazon.awscdk.StackProps;

public class ApplicationLoadBalancerApp {
  public static void main(final String[] args) {
    var app = new App();
    var stackProps = StackProps.builder().build();
    new ApplicationLoadBalancerStack(app, "ApplicationLoadBalancerStack", stackProps);
    app.synth();
  }
}
