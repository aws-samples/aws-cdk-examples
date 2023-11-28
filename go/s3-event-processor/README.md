# S3 Event Processor
---

<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This example is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.
---
<!--END STABILITY BANNER-->

# Summary
This sample project implements a scalable solution to process S3 events in near real-time using SNS, SQS, and Lambda.

The stack for this solution includes the following components:
- An S3 "Upload" bucket, which hosts uploaded files in this case.
- An SNS "S3 Object Created" topic, which sends an event to consumers when an S3 Object PUT operation is executed against the "Upload" bucket. This topic enables the solution to scale across multiple accounts and regions.
- An SQS "S3 Object Created" queue, which buffers events emitted from the SNS topic.
- A Lambda "S3 Object Created Handler" function that polls and processes messages in the queue. In this case, the function simply logs the payload from SQS in JSON format.

The code is this project serves as an example and is not intended for use in a production environment.

# Quick Start
1. Synth the sample stack using the following commands
```
#From aws-cdk-samples repository root
cd go/s3-event-processor
go get
go test
cdk synth
```
2. Configure AWS credentials and target region in your environment
3. Run ```cdk deploy```
4. Once deployed, copy the S3 "Upload" bucket uri, which will be displayed as a cloudformation output.
5. Upload objects to the bucket using AWS console or CLI.
6. Navigate to the Lambda console and select the s3-object-created-handler function in the Lambda/Functions menu
7. Click the Monitor tab under the function overview, then click View CloudWatch Logs
8. Once in CloudWatch, click Search all log streams and use the following query to see the S3 events: ```{ $.message="Received sqs message"}```

# Clean Up
1. Follow steps 1 and 2 above, then run ```cdk destroy```
2. Delete the "Upload" S3 Bucket manually, as it will be retained after stack deletion.
