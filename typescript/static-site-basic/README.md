# Static site

## <!--BEGIN STABILITY BANNER-->

![Stability: Experimental](https://img.shields.io/badge/stability-Experimental-important.svg?style=for-the-badge)

> **This is an experimental example. It may not build out of the box**
>
> This example is built on Construct Libraries marked "Experimental" and may not be updated for latest breaking changes.
>
> If build is unsuccessful, please create an [issue](https://github.com/aws-samples/aws-cdk-examples/issues/new) so that we may debug the problem

---

<!--END STABILITY BANNER-->

This example creates the infrastructure for hosting a static site, which uses an S3 bucket for storing the content. The site contents (located in the 'site-contents' sub-directory) are deployed to the bucket. As this is a basic example, it is not intended for production workloads. It does not use a CloudFront distribution or SSL.

## Prep

## Deploy

```shell
$ npm install -g aws-cdk
$ npm install
$ npm run build
$ cdk deploy -c static-content-prefix=web/static
```
