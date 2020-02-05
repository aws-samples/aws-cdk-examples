package software.amazon.awscdk.examples;

import software.amazon.awscdk.core.App;

public class ClassicLoadBalancerApp{
    public static void main(final String[] args) {
        App app = new App();

        new ClassicLoadBalancerStack(app, "cdk-classic-load-balancer-example");

        app.synth();
    }
}
