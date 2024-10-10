<!--BEGIN STABILITY BANNER-->
---

![Stability: Cfn-Only](https://img.shields.io/badge/stability-Cfn--Only-important.svg?style=for-the-badge)

> **This is an experimental example. It may not build out of the box**
>
> This example is built on Cfn resources.
>
> It requires additional infrastructure prerequisites that must be created before successful build, see below.
>
> If build is unsuccessful, please create an [issue](https://github.com/aws-samples/aws-cdk-examples/issues/new) so that we may debug the problem
---
<!--END STABILITY BANNER-->

## Overview

This project demonstrates how to set up Amazon Quicksight. It will set up a S3 Bucket, import some test data and makes it available as a datasource to quicksight.

With this setup you can create analysis in the console to view e.g. the world-population data:
world-population.csv file in data directory taken from https://data.worldbank.org/indicator/SP.POP.TOTL
License: CC BY-4.0

## Build
 
To build this app, you need to be in this example's root folder. Then run the following:
 
```bash
npm install -g aws-cdk
npm install
npm run build
```

## Deploy

1. Create a quicksight account [by following these instructions](https://docs.aws.amazon.com/quicksight/latest/user/signing-up.html).
2. Use the arn of the quicksight account and pass it to cdk using a context `cdk deploy --context quicksightAccountArn=<arn>`

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template
