package com.myorg;

import software.constructs.Construct;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.codebuild.CfnReportGroup;
import software.amazon.awscdk.services.codebuild.CfnReportGroupProps;

public class ReportgroupStack extends Stack {
    public ReportgroupStack(final Construct scope, final String id) {
        this(scope, id, null);
    }

    public ReportgroupStack(final Construct scope, final String id, final StackProps props) {
        super(scope, id, props);

        CfnReportGroup.S3ReportExportConfigProperty s3ReportExportConfigProperty
                = CfnReportGroup.S3ReportExportConfigProperty.builder()
                .bucket("S3BucketName")
                .path("S3Path")
                .encryptionDisabled(true)
                .packaging("ZIP")
                .build();

        CfnReportGroup.ReportExportConfigProperty exportConfigProperty
                = CfnReportGroup.ReportExportConfigProperty.builder()
                .exportConfigType("S3")
                .s3Destination(s3ReportExportConfigProperty)
                .build();

        CfnReportGroupProps reportGroupProps = CfnReportGroupProps.builder()
                .exportConfig(exportConfigProperty)
                .name("ReportGroupName")
                .type("TEST")
                .build();

        new CfnReportGroup(this, id, reportGroupProps);
    }
}
