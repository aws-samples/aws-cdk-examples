# Chaining S3 to SNS to SQS to Lambda

<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This example is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.
---
<!--END STABILITY BANNER-->

## Overview

A resilient way to trigger lambda when an S3 event occurs. This example uses the following services:

- S3
- SNS
- SQS
- Lambda

## How it works

1. A user uploads a specific file type (in our case .csv) to an S3 Bucket.
2. The upload triggers an event that is automatically sent to an SNS Topic.
3. The SNS Topic notifies a SQS queue, the SQS queue adds a message to it's queue.
4. When the SQS queue adds new messages a Lambda is triggered to process the message.

The lambda is where you can implement your own logic to process the message. In this example the lambda simply parses the message and logs it.

> ⚠️ If the Lambda happens to throw an error (e.g. it fails to parse the message) the message ends up in a dead-letter queue.

## Build and Deploy

1. Ensure aws-cdk is installed and your AWS account/region is [bootstrapped](https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html).

```bash
npm install -g aws-cdk
cdk bootstrap
```

2. Build and deploy.
_You will need to have [Docker](https://docs.docker.com/get-docker/) installed and running._

```bash
npm run build
cdk deploy
```

You should see some useful outputs in the terminal:

```bash
✅  S3SnsSqsLambdaChainStack

✨  Deployment time: 62.61s

Outputs:
S3SnsSqsLambdaChainStack.deadLetterQueue = <LINK_TO_DEAD_LETTER_QUEUE>
S3SnsSqsLambdaChainStack.lambdaLogs = <LINK_TO_LAMBDA_LOGS>
S3SnsSqsLambdaChainStack.s3UploadCommand = <S3_UPLOAD_COMMAND>
Stack ARN: <STACK_ARN>

✨  Total time: 67.29s
```

## Try it out

1. Upload the [`example.csv`](https://github.com/aws-samples/aws-cdk-examples/blob/master/typescript/s3-sns-lambda-chain/example.csv) file to the S3 bucket. You can use the s3 upload command provided in the output of the terminal or the AWS CloudFormation Console.

2. Verify the upload is logged by the lambda function in CloudWatch. A link to the CloudWatch logs can also be found in the output of the terminal or the AWS CloudFormation Console.

## Tutorial

See [this useful workshop](https://cdkworkshop.com/20-typescript.html) on working with the AWS CDK for Typescript projects.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
