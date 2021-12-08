package com.myorg;

import software.constructs.Construct;
import software.amazon.awscdk.Duration;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.codebuild.Artifacts;
import software.amazon.awscdk.services.codebuild.ArtifactsProps;
import software.amazon.awscdk.services.codebuild.BuildEnvironment;
import software.amazon.awscdk.services.codebuild.BuildEnvironmentVariable;
import software.amazon.awscdk.services.codebuild.BuildEnvironmentVariableType;
import software.amazon.awscdk.services.codebuild.ComputeType;
import software.amazon.awscdk.services.codebuild.ISource;
import software.amazon.awscdk.services.codebuild.LinuxBuildImage;
import software.amazon.awscdk.services.codebuild.Project;
import software.amazon.awscdk.services.codebuild.S3SourceProps;
import software.amazon.awscdk.services.codebuild.Source;
import software.amazon.awscdk.services.iam.IRole;
import software.amazon.awscdk.services.iam.Role;
import software.amazon.awscdk.services.s3.Bucket;

import software.amazon.awscdk.services.s3.IBucket;

import java.util.HashMap;
import java.util.Map;

public class ProjectStack extends Stack {

    public ProjectStack(final Construct scope, final String id) {
        this(scope, id, null);
    }

    public ProjectStack(final Construct scope, final String id, final StackProps props) {
        super(scope, id, props);

        BuildEnvironmentVariable buildEnvironmentVariable = new BuildEnvironmentVariable.Builder()
                .type(BuildEnvironmentVariableType.PLAINTEXT)
                .value("varValue")
                .build();
        Map<String, BuildEnvironmentVariable> environmentVariableMap = new HashMap<>();
        environmentVariableMap.put("varName", buildEnvironmentVariable);
        BuildEnvironment environment = BuildEnvironment.builder()
                .buildImage(LinuxBuildImage.AMAZON_LINUX_2_2)
                .computeType(ComputeType.SMALL)
                .environmentVariables(environmentVariableMap).build();

        Artifacts artifacts = new Artifacts(ArtifactsProps.builder().build()) {
            @Override
            public String getType() {
                return "NO_ARTIFACTS";
            }
        };

        IBucket s3Bucket = Bucket.fromBucketName(this, id, "s3bucketname");
        ISource source = Source.s3(S3SourceProps.builder().bucket(s3Bucket).path("S3Path").build());

        IRole role = Role.fromRoleArn(this, "someId", "arn:partition:service:region:account-id:resource-type:resource-id");

        Project.Builder.create(this, "SampleProject")
                .projectName("SampleProject")
                .description("Sample Project using AWS CDK")
                .role(role)
                .artifacts(artifacts)
                .environment(environment)
                .source(source)
                .timeout(Duration.minutes(10))
                .build();

    }
}
