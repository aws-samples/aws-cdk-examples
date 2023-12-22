package com.myorg;

import software.amazon.awscdk.App;

public class BackupS3App {
    public static void main(final String[] args) {
        App app = new App();

        new BackupS3Stack(app, "BackupS3Stack");

        app.synth();
    }
}

