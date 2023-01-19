
# CI/CD Pipeline for SPA Frontend
<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This examples only on the core CDK library, and does not have any infrastructure prerequisites to build.

---
<!--END STABILITY BANNER-->

![Frontend-Pipeline](https://d1zrwss8zuawdm.cloudfront.net/frontend-cicd.png)

This example constructs above architecture with CDK.
You can start simple frontend CI/CD pipeline for ReactJS with this CDK.

If you finish this sample, you will get CloudFront Domain to access the s3 bucket which is the destination of CI/CD Pipeline from AWS CodeCommit Repository.

![Output](https://d32sg88lpbkif7.cloudfront.net/frontend-cicd-out.png)

you will be able to make Serverless Web Frontend with Continuous Delivery Pipeline.

## How to build this sample?

### Setup

- Install AWS CDK
- Install npm
- Clone the repository

### Build

To build this app, you need to be in this example's root folder. Then run the following:

```bash
npm install -g aws-cdk
npm install
npm run build
```

This will install the necessary CDK, then this example's dependencies, and then build your TypeScript files and your CloudFormation template.

### Deploy

Run `cdk deploy`. This will deploy / redeploy your Stack to your AWS Account.

After the deployment you will see the API's URL, which represents the url you can then use.


### Important

Before building the cdk stack, you must set bucket name that is unique globally.
Please see frontend-cicd-stack.ts file.

1. cdk synth
2. cdk deploy

After you deploy the stack, you are able to see CodePipeline that is failed.
Clone your CodeCommit repository and push files inside "sources" folder.

Then CodePipeline will be triggered by your Main branch merge requests and make build to your S3 bucket.



After build is deployed to S3 bucket, the static web page will be served through Amazon CloudFront via OAI.

