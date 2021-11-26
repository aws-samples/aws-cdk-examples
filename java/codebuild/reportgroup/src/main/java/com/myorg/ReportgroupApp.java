package com.myorg;

import software.amazon.awscdk.App;
import software.amazon.awscdk.Environment;
import software.amazon.awscdk.StackProps;

public class ReportgroupApp {
    public static void main(final String[] args) {
        App app = new App();

        new ReportgroupStack(app, "ReportgroupStack", StackProps.builder().env(
                Environment.builder()
                        .account("ReportgroupStack")
                        .region("us-west-2")
                        .build()).build());

        app.synth();
    }
}
