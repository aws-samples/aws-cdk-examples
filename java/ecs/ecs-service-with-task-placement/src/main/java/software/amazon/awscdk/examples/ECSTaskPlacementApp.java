package software.amazon.awscdk.examples;

import software.amazon.awscdk.core.App;

public class ECSTaskPlacementApp {
    public static void main(final String argv[]) {
        App app = new App();

        new ECSTaskPlacementStack(app, "ECSTaskPlacementStack");

        // required until https://github.com/aws/jsii/issues/456 is resolved
        app.synth();
    }
}
