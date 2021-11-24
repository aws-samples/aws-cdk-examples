# Static site
<!--BEGIN STABILITY BANNER-->
---

![Stability: Experimental](https://img.shields.io/badge/stability-Experimental-important.svg?style=for-the-badge)

> **This is an experimental example. It may not build out of the box**
>
> This example is built on Construct Libraries marked "Experimental" and may not be updated for latest breaking changes.
>
> If build is unsuccessful, please create an [issue](https://github.com/aws-samples/aws-cdk-examples/issues/new) so that we may debug the problem

---
<!--END STABILITY BANNER-->

This example creates the infrastructure for a static site, which uses an S3 bucket for storing the content.  The site contents (located in the 'site-contents' sub-directory) are deployed to the bucket.

The site redirects from HTTP to HTTPS, using a CloudFront distribution, Route53 alias record, and ACM certificate.

## Prep

The domain for the static site (i.e. mystaticsite.com) must be configured as a hosted zone in Route53 prior to deploying this example. For instructions on configuring Route53 as the DNS service for your domain, see the [Route53 documentation](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-configuring.html).

## Deploy

```shell
$ npm install -g aws-cdk
$ npm install
$ npm run build
$ cdk deploy -c accountId=123456789 -c domain=mystaticsite.com -c subdomain=www
```
