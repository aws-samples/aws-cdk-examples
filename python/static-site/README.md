# Static site
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

This example creates the infrastructure for a static site, which uses an S3 bucket for storing the content.

The site redirects from HTTP to HTTPS, using a CloudFront distribution, Route53 alias record, and ACM certificate.

## Prep

The ACM certificate is expected to be created and validated outside of the CDK, with the certificate ARN stored in an AWS Systems Manager Parameter Store parameter.

Further, we also expect the role used for cloudformation to have access to the Route53 Hosted Zone that is the authority for this domain.

```
$ aws ssm put-parameter --region us-east-1 --name CertificateArn-[YOUR_SUB_DOMAIN_HERE].[YOUR_DOMAIN_HERE] --type String --value arn:aws:acm:...
```

## Deploy Infrastructure

```
$ npm install -g aws-cdk
$ python3 -m venv .env
$ source .env/bin/activate
$ pip install -r requirements.txt
$ cdk deploy -c domain=[YOUR_DOMAIN_HERE] -c sub_domain=[YOUR_SUB_DOMAIN_HERE] -c hosted_zone_id=[ID_FOR_YOUR_HOSTED_ZONE]
```

## Deploy Site Content

During the infrastructure deployment, you will see an output named something like "StaticSiteBucket34E5D9AF".  The value is the bucket name where you can upload the static site content.

You will also see an output named something like "StaticSiteDistributionId8C64EF2A".  This value is the distribution ID for the CloudFront distribution, which needs to be invalidated each time new content is uploaded to the bucket.

```
$ aws s3 sync . s3://$STATIC_SITE_BUCKET
$ aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
```