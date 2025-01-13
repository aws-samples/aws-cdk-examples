/**
 * Copyright 2024 Amazon.com, Inc. and its affiliates. All Rights Reserved.
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
import * as cloudfront_origins from "aws-cdk-lib/aws-cloudfront-origins";

export interface CloudFrontS3WebSiteConstructProps extends cdk.StackProps {
  /**
   * The path to the build directory of the web site, relative to the project root
   * ex: "./app/dist"
   */
  readonly webSiteBuildPath: string;

  /**
   * The Arn of the WafV2 WebAcl.
   */
  readonly webAclArn?: string;
  /**
   * The Cognito UserPoolId to authenticate users in the front-end
   */
  readonly userPoolId: string;

  /**
   * The Cognito AppClientId to authenticate users in the front-end
   */
  readonly appClientId: string;

  /**
   * The Cognito IdentityPoolId to authenticate users in the front-end
   */
  readonly identityPoolId: string;

  /**
   * The name of the bucket to use as storage using Amplify SDK if required
   */
  readonly storageBucketName?: string;

  /**
   * If you use Amplify SDK to access an API serving under /api path set this boolean to true
   */
  readonly withApi?: boolean;
}

const defaultProps: Partial<CloudFrontS3WebSiteConstructProps> = {};

/**
 * Deploys a CloudFront Distribution pointing to an S3 bucket containing the deployed web application {webSiteBuildPath}.
 * Creates:
 * - S3 bucket
 * - CloudFrontDistribution
 * - OriginAccessIdentity
 *
 * On redeployment, will automatically invalidate the CloudFront distribution cache
 */
export class CloudFrontS3WebSiteConstruct extends Construct {
  /**
   * The origin access identity used to access the S3 website
   */
  public originAccessIdentity: cdk.aws_cloudfront.OriginAccessIdentity;

  /**
   * The cloud front distribution to attach additional behaviors like `/api`
   */
  public cloudFrontDistribution: cdk.aws_cloudfront.Distribution;

  /**
   * The name of the bucket where the frontend assets are stored
   */
  public siteBucket: cdk.aws_s3.Bucket;

  constructor(
    parent: Construct,
    name: string,
    props: CloudFrontS3WebSiteConstructProps,
  ) {
    super(parent, name);

    props = { ...defaultProps, ...props };
    const stack = cdk.Stack.of(this);
    const region = stack.region;

    // When using Distribution, do not set the s3 bucket website documents
    // if these are set then the distribution origin is configured for HTTP communication with the
    // s3 bucket and won't configure the cloudformation correctly.
    this.siteBucket = new cdk.aws_s3.Bucket(this, "WebApp", {
      encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
      autoDeleteObjects: true,
      blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      enforceSSL: true,
    });

    this.siteBucket.addToResourcePolicy(
      new cdk.aws_iam.PolicyStatement({
        sid: "EnforceTLS",
        effect: cdk.aws_iam.Effect.DENY,
        principals: [new cdk.aws_iam.AnyPrincipal()],
        actions: ["s3:*"],
        resources: [
          this.siteBucket.bucketArn,
          this.siteBucket.bucketArn + "/*",
        ],
        conditions: { Bool: { "aws:SecureTransport": "false" } },
      }),
    );

    const originAccessIdentity = new cdk.aws_cloudfront.OriginAccessIdentity(
      this,
      "OriginAccessIdentity",
    );
    this.siteBucket.grantRead(originAccessIdentity);

    // const s3origin = new cdk.aws_cloudfront_origins.S3Origin(this.siteBucket, {
    //   originAccessIdentity: originAccessIdentity,
    // });

    const cloudFrontDistribution = new cdk.aws_cloudfront.Distribution(
      this,
      "WebAppDistribution",
      {
        defaultBehavior: {
          // origin: s3origin,
          origin: cloudfront_origins.S3BucketOrigin.withOriginAccessControl(
            this.siteBucket,
          ),

          cachePolicy: new cdk.aws_cloudfront.CachePolicy(this, "CachePolicy", {
            defaultTtl: cdk.Duration.hours(1),
          }),
          allowedMethods: cdk.aws_cloudfront.AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy:
            cdk.aws_cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
        },
        errorResponses: [
          {
            httpStatus: 404,
            ttl: cdk.Duration.hours(0),
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
          },
        ],
        defaultRootObject: "index.html",
        webAclId: props.webAclArn,
        minimumProtocolVersion:
          cdk.aws_cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021, // Required by security
      },
    );

    const amplifyConfig: any = {
      Auth: {
        Cognito: {
          allowGuestAccess: false,
          region: region,
          userPoolId: props.userPoolId,
          userPoolClientId: props.appClientId,
          identityPoolId: props.identityPoolId,
        },
      },
    };
    if (props.withApi) {
      // Add or remove extra config properties you may need here like API or storage

      amplifyConfig.API = {
        REST: {
          api: {
            endpoint: `./api`,
            region: region,
          },
        },
      };
    }
    if (props.storageBucketName) {
      amplifyConfig.Storage = {
        S3: {
          region: region,
          bucket: props.storageBucketName,
        },
      };
    }

    new cdk.aws_s3_deployment.BucketDeployment(this, "DeployWithInvalidation", {
      sources: [
        cdk.aws_s3_deployment.Source.asset(props.webSiteBuildPath), // Main webapp from root directory
        cdk.aws_s3_deployment.Source.jsonData("config.json", amplifyConfig), // Amplify config file
      ],
      destinationBucket: this.siteBucket,
      distribution: cloudFrontDistribution, // this assignment, on redeploy, will automatically invalidate the cloudfront cache
      distributionPaths: ["/*"],
      // default of 128 isn't large enough for larger website deployments. More memory doesn't improve the performance.
      // You want just enough memory to guarantee deployment
      memoryLimit: 512,
    });

    // export any cf outputs
    new cdk.CfnOutput(this, "SiteBucket", {
      value: this.siteBucket.bucketName,
    });
    new cdk.CfnOutput(this, "CloudFrontDistributionId", {
      value: cloudFrontDistribution.distributionId,
    });
    new cdk.CfnOutput(this, "CloudFrontDistributionDomainName", {
      value: cloudFrontDistribution.distributionDomainName,
    });
    new cdk.CfnOutput(this, "CloudFrontDistributionUrl", {
      value: `https://${cloudFrontDistribution.distributionDomainName}`,
    });

    // assign public properties
    this.originAccessIdentity = originAccessIdentity;
    this.cloudFrontDistribution = cloudFrontDistribution;
  }
}
