package com.amazonaws.cdk.examples;

import software.amazon.awscdk.App;

public class ECSFargateLoadBalancedApp {
    public static void main(final String argv[]) {
        App app = new App();

        new ECSFargateLoadBalancedStack(app, "fargate-load-balanced-service");

        // required until https://github.com/aws/jsii/issues/456 is resolved
        app.synth();
    }
}
