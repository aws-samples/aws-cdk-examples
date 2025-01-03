/**
 * Copyright (c) 2024 Amazon.com, Inc. and its affiliates.
 * All Rights Reserved.
 *
 * Licensed under the Amazon Software License (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *   http://aws.amazon.com/asl/
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export interface S3ConstructProps extends cdk.StackProps {
    /**
     * Is versioning enabled on this bucket ?
     *
     * @default true
     */
    readonly versioned?: boolean;

    /**
     * What is the role of this bucket, general use or for VPC, S3 logging etc.
     * Selecting 'logging' will add LOG_DELIVERY_WRITE access control and will also
     * enable tiered storage fro 30/90 archive/deep archive of logs.
     *
     * @default general
     */
    readonly config?: "general" | "logging";
}

const defaultProps: Partial<S3ConstructProps> = {
    versioned: true,
    config: "general",
};

/**
 * Deploys the s3 bucket
 */
export class S3Construct extends Construct {
    public dataBucket: cdk.aws_s3.Bucket;

    constructor(parent: Construct, name: string, props: S3ConstructProps) {
        super(parent, name);

        props = { ...defaultProps, ...props };

        this.dataBucket = new cdk.aws_s3.Bucket(this, "Bucket", {
            encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
            blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
            enforceSSL: true,
            versioned: props.versioned,
            autoDeleteObjects: true, // NOT recommended for production code
            removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
            accessControl:
                props.config === "logging"
                    ? cdk.aws_s3.BucketAccessControl.LOG_DELIVERY_WRITE
                    : undefined,
            intelligentTieringConfigurations:
                props.config === "logging"
                    ? [
                          {
                              name: "archive",
                              archiveAccessTierTime: cdk.Duration.days(90), //Days specified in ARCHIVE_ACCESS tier should not be less than 90
                              deepArchiveAccessTierTime: cdk.Duration.days(180), //Days specified in DEEP_ARCHIVE_ACCESS should not be less than 180, and be greater than days specified in ARCHIVE_ACCESS
                          },
                      ]
                    : undefined,
        });

        new cdk.CfnOutput(this, `BucketName`, {
            value: `${this.dataBucket.bucketName}`,
        });

        new cdk.CfnOutput(this, `BucketArn`, {
            value: `${this.dataBucket.bucketArn}`,
        });
    }
}
