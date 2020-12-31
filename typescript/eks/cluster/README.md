# EKS Cluster
<!--BEGIN STABILITY BANNER-->
---

![Stability: Experimental](https://img.shields.io/badge/stability-Experimental-important.svg?style=for-the-badge)

> **This is an experimental example. It may not build out of the box**
>
> This examples does is built on Construct Libraries marked "Experimental" and may not be updated for latest breaking changes.
>
> If build is unsuccessful, please create an [issue](https://github.com/aws-samples/aws-cdk-examples/issues/new) so that we may debug the problem

---
<!--END STABILITY BANNER-->

This example creates the infrastructure for a static site, which uses an S3 bucket for storing the content.  The site contents (located in the 'site-contents' sub-directory) are deployed to the bucket.

The site redirects from HTTP to HTTPS, using a CloudFront distribution, Route53 alias record, and ACM certificate.

> **Note:** Due to a known issue, the example does not currently work with version `1.81.0`. See https://github.com/aws/aws-cdk/issues/12291 for possible workarounds if you require version `1.81.0`.

