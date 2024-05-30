package com.myorg;

import software.amazon.awscdk.App;
import software.amazon.awscdk.StackProps;

public class CustomLogicalNamesApp {
    public static void main(final String[] args) {
        App app = new App();
        StackProps stackProps = StackProps.builder().build();
        new CustomLogicalNamesStack(app, "CustomLogicalNamesStack", stackProps);
        app.synth();
    }
}