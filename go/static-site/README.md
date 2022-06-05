<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This example is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.
---
<!--END STABILITY BANNER-->

NOTICE: Go support is still in Developer Preview. This implies that APIs may change while we address early feedback from the community. We would love to hear about your experience through GitHub issues.

# Launch a Secure Static Site
This example launches a secure static site hosted in an S3 bucket, distributed by CloudFront, protected by an ACM certificate, and with URIs automatically rewritten by a CloudFront Function (e.g. a request for example.com is served  example.com/index.html by default). 

To get set up with go check out the useful articles: 
- [Working with the AWS CDK in Go](https://docs.aws.amazon.com/cdk/latest/guide/work-with-cdk-go.html)
- [Getting started with the AWS Cloud Development Kit and Go](https://aws.amazon.com/blogs/developer/getting-started-with-the-aws-cloud-development-kit-and-go/)

## Deploy

Fill in the variables DOMAIN_NAME and ASSET_PATH. 

DOMAIN_NAME must be a domain name that the user owns (like example.com) and it must have a Hosted Zone in Route53 containing only NS and SOA records.

ASSET_PATH is a local directory containing files for the static site. These files will be deployed to an S3 bucket. 

This code requires a bootstrapping step where the local files are first uploaded into a staging bucket. The staging bucket name is a hash of the source files, making this a one time step unless the source files are changed. This bucket also contains ~10MiB of aws-cli files.

Run the following commands to create a static site:

```
cdk bootstrap
cdk synth  
cdk deploy
```

## What this code does

In the bootstrapping step the local files are zipped and added to a staging bucket. In the deployment step, the files are deployed to an S3 bucket. A CloudFront Origin Access Identity is created and then added as a principal to a bucket policy which allows CloudFront to access the bucket. The bucket is added as an origin to the Cloudfront distribution.

A certificate is created and automatically validated by looking up the appropriate hosted zone. A Cloudfront Function is attached as an inline function present in the code that will rewrite the URI's in response to a viewer request event. The function is an inline version of a function from [AWS-samples](https://github.com/aws-samples/amazon-cloudfront-functions/tree/main/url-rewrite-single-page-apps).

Finally, a record is added to the Hosted Zone where the domain is located. The hosted zone is looked up by the domain name. Looking up the Hosted Zone by ID does not work for this step because that function doesn't have access to the zone name.

## More About aws-cdk-go
Many property fields contain "nil" values which is Go's empty reference. Other values are references to undeclared slices. By default, go functions make a copy of arguments that they are passed. Thus, in aws-cdk-go references are often passed explicitly by using the "&" operator or the jsii.String("") helper function. See [Working with the AWS CDK in Go](https://docs.aws.amazon.com/cdk/latest/guide/work-with-cdk-go.html) and the blog post [Getting started with the AWS Cloud Development Kit and Go](https://aws.amazon.com/blogs/developer/getting-started-with-the-aws-cloud-development-kit-and-go/) for more details.

Additionally, several properties require inputs as a reference to a slice. For example we request the Bucket ARN so that we can add it to a new policy:
```
cdkBucketArn := cdkBucket.ArnForObjects(jsii.String("*"))
```
but because a new policy can accomodate multiple ARNs we add our single ARN into a slice before passing it to the policy statement construct:
```
cdkBucketArnSlice := &[]*string{cdkBucketArn}     //a reference (&) to a slice of pointers (*) to strings

cdkPermission := awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
	Resources:     cdkBucketArnSlice,
})
```
