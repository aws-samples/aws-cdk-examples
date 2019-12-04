package software.amazon.awscdk.examples;

import software.amazon.awscdk.core.App;

public class ResourceOverridesApp {
    public static void main(final String[] args) {
        App app = new App();

        new ResourceOverridesStack(app, "resource-overrides");

        app.synth();
    }
}
