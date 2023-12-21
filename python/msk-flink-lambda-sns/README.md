
# Real-Time Streaming with Amazon Managed Apache Kafka and Flink 

<!--BEGIN STABILITY BANNER-->
---

![Stability: Developer Preview](https://img.shields.io/badge/stability-Developer--Preview-important.svg?style=for-the-badge)

> **This is an experimental example. It may not build out of the box**
>
> This example is built on Construct Libraries marked "Developer Preview" and may not be updated for latest breaking changes.
>
> It may additionally requires infrastructure prerequisites that must be created before successful build.
>
> If build is unsuccessful, please create an [issue](https://github.com/aws-samples/aws-cdk-examples/issues/new) so that we may debug the problem 
---
<!--END STABILITY BANNER-->

## Overview
Based on the following AWS Blog: https://aws.amazon.com/blogs/big-data/build-a-real-time-streaming-application-using-apache-flink-python-api-with-amazon-kinesis-data-analytics/

![Architecture Diagram](https://d2908q01vomqb2.cloudfront.net/b6692ea5df920cad691c20319a6fffd7a4a766b8/2021/03/25/bdb1289-pyflink-kda-1-1.jpg
 "Resources created with CDK")

To run: 
1. Install the required dependencies:
```
pip install -r requirements.txt
```

2. (Optional) Bootstrap AWS Account for CDK:
```
cdk bootstrap
```

3. Deploy the stack (30-40 mins):

```
cdk deploy
```

