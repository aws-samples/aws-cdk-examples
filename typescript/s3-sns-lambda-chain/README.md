# Chaining S3 to SNS to SQS to Lambda
---

<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This example is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.
---
<!--END STABILITY BANNER-->


## Overview
A common pattern that I have used to create a resilient way to trigger a lambda when an event occurs on S3 is to chain the following services:

- S3
- SNS
- SQS
- Lambda


## Justification
This example illustrates the following concepts:
- Chaining Services
- Disconnected Event Notifications and Handling
- Resilient storage to process request
- Asynchronous processing of request
- Scalable, Serverless Architecture


## Example Details
1. A user uploads a specific file type to an S3 Bucket
2. This upload triggers an event that notifies an SNS Topic by publishing a message with the S3 event details
3. The SNS Topic has an SQS queue that subscribes to notifications
4. When the upload event is published, the SNS message is put into the SQS Queue
5. A Lambda is polling the SQS as its Event Source
6. The Lambda receives the message from the SQS queue and processes it
7. If the message is not processed by the Lambda the message eventually ends up in a dead-letter queue


## Build and Deploy

The `cdk.json` file tells the CDK Toolkit how to execute your app.


## Tutorial  
See [this useful workshop](https://cdkworkshop.com/20-typescript.html) on working with the AWS CDK for Typescript projects.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
