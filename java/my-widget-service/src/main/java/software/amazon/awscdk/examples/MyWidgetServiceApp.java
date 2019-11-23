package software.amazon.awscdk.examples;

import software.amazon.awscdk.core.App;



import java.util.Arrays;

public class MyWidgetServiceApp {
    public static void main(final String argv[]) {
        App app = new App();

        new MyWidgetServiceStack(app, "MyWidgetServiceStack");

        app.synth();
    }
}
