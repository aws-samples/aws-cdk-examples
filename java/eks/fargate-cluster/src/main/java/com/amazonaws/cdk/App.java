package com.amazonaws.cdk;

public class App {
    public static void main(final String[] args) {
        final software.amazon.awscdk.App app = new software.amazon.awscdk.App();

        final VpcStack vpcStack = new VpcStack(app, "VpcStack");

        final EksFargateProps eksFargateProps = EksFargateProps.builder()
                .vpc(vpcStack.getVpc())
                .build();

        new EksFargateStack(app, "EksFargateStack", eksFargateProps);

        app.synth();
    }
}
