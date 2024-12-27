#!/usr/bin/env node
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { CfnOutput, RemovalPolicy, Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import path = require("path");

export interface StaticSiteBasicProps {
  staticContentPrefix: string;
}

/**
 * Static site infrastructure, which deploys site content to an S3 bucket.
 */
export class StaticSiteBasic extends Construct {
  constructor(parent: Stack, name: string, props: StaticSiteBasicProps) {
    super(parent, name);

    // Content bucket
    const indexDocument = "index.html";

    const websiteBucket = new s3.Bucket(this, "WebsiteBucket", {
      websiteIndexDocument: indexDocument,
      publicReadAccess: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),
      /**
       * The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
       * the new bucket, and it will remain in your account until manually deleted. By setting the policy to
       * DESTROY, cdk destroy will attempt to delete the bucket, but will error if the bucket is not empty.
       */
      removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code

      /**
       * For sample purposes only, if you create an S3 bucket then populate it, stack destruction fails.  This
       * setting will enable full cleanup of the demo.
       */
      autoDeleteObjects: true, // NOT recommended for production code
    });

    new CfnOutput(this, "Bucket", { value: websiteBucket.bucketName });
    new CfnOutput(this, "StaticSiteUrl", {
      value: [
        websiteBucket.bucketWebsiteUrl,
        props.staticContentPrefix,
        indexDocument,
      ].join("/"),
    });

    // Deploy site contents to S3 bucket
    new s3deploy.BucketDeployment(this, "DeployWebsite", {
      sources: [s3deploy.Source.asset(path.join(__dirname, "./site-contents"))],
      destinationBucket: websiteBucket,
      destinationKeyPrefix: props.staticContentPrefix, // optional prefix in destination bucket
    });
  }
}
