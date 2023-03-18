# Static Website With Simple Storage Service (S3) and CloudFront

## <!--BEGIN STABILITY BANNER-->

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This example is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.

---

<!--END STABILITY BANNER-->

## Overview

This AWS CDK Go sample demonstrates how to host a static website in an S3 Bucket and serve content using a CloudFront Distribution.

## Real-world Example

When working with a static website, it is more efficient to host the static files in an S3 Bucket, rather than a server that is always running. To achieve this, we store the site static files in an S3 Bucket, and create a CloudFront Distribution that has the S3 Bucket set as its origin to retrieve, serve, and cache content.

## AWS Services Utilized

- CloudFront
- Simple Storage Service (S3)
- AWS Certificate Manager (ACM)
- Identity and Access Management (IAM)

## Deploying

## Testing

## Further Improvements

## Useful commands

- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template
- `go test` run unit tests
