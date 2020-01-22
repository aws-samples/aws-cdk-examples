package com.myorg;

import software.amazon.awscdk.core.*;

public class CodeBuildJavaCdkApp {
    public static void main(final String[] args) {
        App app = new App();

        new CodeBuildProjectStack(app, "CodeBuildProjectStack", StackProps.builder().env(
                Environment.builder()
                        .account("firstStack")
                        .region("us-west-2")
                        .build()).build());

        new ReportGroupStack(app, "ReportGroupStack", StackProps.builder().env(
                Environment.builder()
                        .account("firstStack")
                        .region("us-west-2")
                        .build()).build());

        new SourceCredentialStack(app, "SourceCredentialStack", StackProps.builder().env(
                Environment.builder()
                        .account("firstStack")
                        .region("us-west-2")
                        .build()).build());

        app.synth();
    }
}
