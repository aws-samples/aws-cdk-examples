package software.amazon.awscdk.samples;

import software.amazon.awscdk.App;

public class ApplicationLoadBalancer {
    public static void main(final String argv[]) {
        App app = new App();

        new ApplicationLoadBalancerStack(app, "LoadBalancerStack");

        app.run();
    }
}
