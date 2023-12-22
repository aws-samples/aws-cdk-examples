package com.myorg;

import software.amazon.awscdk.App;

public class Ec2InstanceApp {
    public static void main(final String[] args) {
        App app = new App();

        new Ec2InstanceStack(app, "Ec2InstanceStack");

        app.synth();
    }
}

