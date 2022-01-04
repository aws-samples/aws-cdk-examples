package com.myorg;

import software.amazon.awscdk.App;
import software.amazon.awscdk.Environment;
import software.amazon.awscdk.StackProps;

public class ProjectApp {
    public static void main(final String[] args) {
        App app = new App();

        new ProjectStack(app, "ProjectStack", StackProps.builder().env(
                Environment.builder()
                        .account("projectStack")
                        .region("us-west-2")
                        .build()).build());

        app.synth();
    }
}
