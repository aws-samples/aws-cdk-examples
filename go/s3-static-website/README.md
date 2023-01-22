# Static site

This example creates the infrastructure for a static site, which uses an S3 bucket for storing the content.  The site contents (located in the 'site-contents' sub-directory) are deployed to the bucket.

The site redirects from HTTP to HTTPS, using a CloudFront distribution, Route53 alias record, and ACM certificate.

## Prep

A domain for the static site (i.e. mystaticsite.com) must be configured as a hosted zone in Route53 prior to deploying this example. For instructions on configuring Route53 as the DNS service for your domain, see the [Route53 documentation](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-configuring.html).

## Deploy

```shell
$ cdk deploy -c domain=<YOUR_DOMAIN> -c subdomain=<YOUR_SUBDOMAIN>
```