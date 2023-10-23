# CodeWhisperer CloudWatch Dashboard

This AWS CDK application deploys a dashboard to Amazon CloudWatch to display metrics on the usage of Amazon CodeWhisperer. 

See [this blog post](https://aws.amazon.com/blogs/devops/codewhisperer-cloudwatch) for more information.

(TODO - Fix the link when the blog is published)

This sample code can be adapted for use in your own infrastructure delivery pipelines.

## Installation instructions

In order to install this sample, make sure that you have a recent version of the AWS CDK installed.

```sh
npm install -g aws-cdk
```

Clone the examples repository and `cd` into the directory for this sample.

```sh
git clone git@github.com:aws-samples/aws-cdk-examples.git
cd aws-cdk-examples/typescript/codewhisperer-cloudwatch
```

If you have never used CDK in your account, you will need to bootstrap it first.

```sh
cdk bootstrap
```

Deploy the application. This will create two dashboards.

```sh
cdk deploy
```

In order to avoid ongoing account charges, don't forget to clean up.

```sh
cdk destroy
```





