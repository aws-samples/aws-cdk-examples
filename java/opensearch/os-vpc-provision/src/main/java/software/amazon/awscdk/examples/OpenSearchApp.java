package software.amazon.awscdk.examples;

import software.amazon.awscdk.App;
import software.amazon.awscdk.StackProps;

public class OpenSearchApp {
        public static void main(final String[] args) {
                App app = new App();
                new OpenSearchStack(app, "OpenSearchStack", StackProps.builder()
                                .build());
                app.synth();
        }
}
