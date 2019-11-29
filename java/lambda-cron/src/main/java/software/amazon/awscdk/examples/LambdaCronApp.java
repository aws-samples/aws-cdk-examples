package software.amazon.awscdk.examples;

import software.amazon.awscdk.core.App;

public class LambdaCronApp {
    public static void main(final String[] args) {
        App app = new App();

        new LambdaCronStack(app, "cdk-software.amazon.awscdk.examples.lambda-cron-example");

        app.synth();
    }
}
