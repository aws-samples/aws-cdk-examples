# Static Website With Simple Storage Service (S3) and CloudFront

## <!--BEGIN STABILITY BANNER-->

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This example is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.

---

<!--END STABILITY BANNER-->

## Overview

This AWS Cloud Development Kit (CDK) Go sample demonstrates how to host a static website in an S3 Bucket and serve content using a CloudFront Distribution.

This example allows you configure a Route 53 subdomain in an existing Hosted Zone that you control. The subdomain will be pointed to the CloudFront Distribution to access the static content. Otherwise, it can be accessed using the public CloudFront endpoint e.g. `xxxxxxxxxxxxxx.cloudfront.net`.

## Real-world Example

When working with a static website, it is more efficient to host the assets in an S3 Bucket, rather than a server that is always running. To achieve this, we store the assets in an S3 Bucket, and create a CloudFront Distribution that uses the S3 Bucket as its origin to retrieve, serve, and cache content.

## AWS Services Utilized

### Without a Hosted Zone

- CloudFront
- Simple Storage Service (S3)
- Identity and Access Management (IAM)

### With a Hosted Zone

- Route 53
- AWS Certificate Manager (ACM)

## Deploying

- Authenticate to an AWS account via a Command Line Interface (CLI).
- Navigate to this `static-site` directory.
- Run `go mod tidy` to set up the required dependencies.
- In the `static-site.go` file, locate the `config` struct in the `main()` function and enter values for the following:
  - `bucketName` (required)
  - `hostedZone` (optional)
  - `subdomain` (optional)
- `cdk synth` to generate and review the CloudFormation template.
- `cdk diff` to compare local changes with what is currently deployed.
- `go test` to run the tests we specify in `static-site_test.go`.
- `cdk deploy` to deploy the stack to the AWS account you're authenticated to.

## Outputs

After a successful deployment, CDK will output endpoints for the following:

- CloudFront Distribution
- Route 53 (if a Hosted Zone was configured)
- S3 Bucket (to demonstrate that the bucket is not publicly accessible)

## Testing

- To test that the static site is running, we can use either the CloudFront Distribution endpoint, or Route 53 endpoint (if configured).
- Navigate to the AWS Console to view the services that were deployed:
  - S3 Bucket
  - CloudFront Distribution
  - Lambda Function (for S3 Bucket deployment)
  - Route 53 record (if Hosted Zone configured)
  - SSL/TLS certificate via ACM (if Hosted Zone configured)

## Further Improvements

- Protect your ALB from attacks and malicious traffic using [Web Application Firewall (WAF)](https://docs.aws.amazon.com/waf/latest/developerguide/waf-chapter.html).
- Use a [CloudFront Distribution to cache results](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ConfiguringCaching.html) returned from the application, reducing load on the containerized application overall.
