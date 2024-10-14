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

## Resources

1. * `Bucket` (aws-s3): Creates an Amazon S3 bucket with encryption and full access control, used to store data files and the manifest for QuickSight.
2. * `BucketDeployment` (aws-s3-deployment): Deploys world population data and manifest JSON files to the S3 bucket, making them accessible for analysis in QuickSight.
3. * `CfnDataSource` (aws-quicksight): Defines an Amazon QuickSight data source that connects to the S3 bucket to access the uploaded CSV files.
4. * `CfnDataSet` (aws-quicksight): Configures a QuickSight dataset that organizes and structures the CSV data from the S3 bucket for reporting and analysis.
5. * `CfnManagedPolicy` (aws-iam): Creates an IAM policy granting permissions to the QuickSight service role, allowing access to the S3 bucket and other necessary actions.

## Deploy

1. Create a quicksight account [by following these instructions](https://docs.aws.amazon.com/quicksight/latest/user/signing-up.html).
2. Use the arn of the quicksight account and pass it to cdk using a context `cdk deploy --context quicksightAccountArn=<arn>`

The Quicksight account arn should look like this 'arn:aws:quicksight:\<region>:\<accountid>:user/\<namespace>/\<username>'

#### \<region>
The aws region that contains the quicksight resources.
#### \<accountid>
This is your AWS account id.
#### \<namespace>
You can create a separate namespace, but if you haven't created one it should be 'default'.
#### \<username>
You can find the username in Quicksight. It should be the same as your IAM Account name
and if you are using a role it will be added to the name as well like: \<role>/\<username>

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template
