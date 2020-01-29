package com.myorg;

import software.amazon.awscdk.core.App;
import software.amazon.awscdk.core.Environment;
import software.amazon.awscdk.core.StackProps;

import java.util.Arrays;

public class SourceCredentialApp {
    public static void main(final String[] args) {
        App app = new App();

        new SourceCredentialStack(app, "SourceCredentialStack", StackProps.builder().env(
                Environment.builder()
                        .account("SourceCredentialStack")
                        .region("us-west-2")
                        .build()).build());

        app.synth();
    }
}
