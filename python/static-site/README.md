# Static Site with AWS CDK
This sample project uses S3, CloudFront and Route53 to create a stack for 
hosting a static web site.

The only prerequisite before deploying this stack is to have a registered domain in Route53.

The following creates a stack with namespace of `mysite` and create a dns record for
`example.com`. It then internally creates all the required resources.
```sh
cdk deploy \
    -c namespace="mysite" \
    -c domain_name="example.com"
```


If the domain certificate has already been created (e.g. for wildcard certificates), then it 
can be passed as a context variable.
```sh
cdk deploy \ 
    -c namespace="mysite" \
    -c domain_name="example.com" \
    -c domain_certificate_arn="arn:aws:acm:us-east-1:123456789012:certificate/abc"
```

To destroy the stack
```sh
cdk destroy \
    -c namespace="mysite" \
    -c domain_name="example.com"
```