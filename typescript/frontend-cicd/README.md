## Overview

![Frontend-Pipeline](https://d1zrwss8zuawdm.cloudfront.net/frontend-cicd.png)

This sample constructs above architecture with CDK.
You can start simple frontend CI/CD pipeline for ReactJS with this CDK.

## Prerequisites

If you are first to use CDK, you need to run CDK BootStrap.

How to install CDK?
 : [AWS Doc](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html)

## Build and Deploy

### Important

Before building the cdk stack, you must set bucket name that is unique globally.
Please see frontend-cicd-stack.ts file.

### CDK Deploy

1. cdk synth
2. cdk deploy

After you deploy the stack, you are able to see CodePipeline that is failed.
Clone your CodeCommit repository and push files inside "sources" folder.

Then CodePipeline will be triggered by your Main branch merge requests and make build to your S3 bucket.

After build is deployed to S3 bucket, the static web page will be served through Amazon CloudFront via OAI.
