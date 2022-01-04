package com.myorg;

import software.constructs.Construct;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.codebuild.CfnSourceCredential;
import software.amazon.awscdk.services.codebuild.CfnSourceCredentialProps;

public class SourceCredentialStack extends Stack {
    public SourceCredentialStack(final Construct scope, final String id) {
        this(scope, id, null);
    }

    public SourceCredentialStack(final Construct scope, final String id, final StackProps props) {
        super(scope, id, props);

        CfnSourceCredentialProps sourceCredentialProps = CfnSourceCredentialProps.builder()
                .authType("BASIC_AUTH")
                .serverType("BITBUCKET")
                .token("app_password")
                .username("app_username")
                .build();

        new CfnSourceCredential(this, id, sourceCredentialProps);
    }
}
