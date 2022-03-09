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
Create a resilient way to trigger a lambda when an event occurs on S3. It chains the following services:

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


### Python setup

This project is set up like a standard Python project. The initialization process also creates a virtualenv within this
project, stored under the `.env` directory. To create the virtualenv it assumes that there is a `python3` (or `python`
for Windows) executable in your path with access to the `venv` package. If for any reason the automatic creation of the
virtualenv fails, you can create the virtualenv manually.

To manually create a virtualenv on MacOS and Linux:

```
$ python3 -m venv .env
```

After the init process completes and the virtualenv is created, you can use the following
step to activate your virtualenv.

```
$ source .env/bin/activate
```

If you are a Windows platform, you would activate the virtualenv like this:

```
% .env\Scripts\activate.bat
```

Once the virtualenv is activated, you can install the required dependencies.

```
$ pip install -r requirements.txt
```

At this point you can now synthesize the CloudFormation template for this code.

```
$ cdk synth
```

### CDK Deploy

When deployed, CDK creates a layer .zip
asset to be stored in a staging bucket managed by CDK. To enable this the AWS account being used needs to be
[bootstrapped](https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html).

With default profile,
```
$ cdk bootstrap
```

With specific profile,
```
$ cdk bootstrap --profile test
```

With the bootstrap complete, we are ready to deploy the lambda function and lambda layer.

```
$ cdk deploy
```

## Unit Tests
Install testing tools
```
$ pip install -r requirements-dev.txt
```

CDK Unit Tests are designed to validate the following template components
  - outputs
  - mappings
  - resources
  - parameters
  - conditions
  - resource_properties

To generate a template without generating the associated assets, run the following command
```
cdk synth --no-staging > template.yml
```
**DO NOT** check this file in as it is only to verify the correct template is being generated.

### Running Unit Tests
To invoke Unit Tests (from the root project folder)
```
pytest
```

If you want to invoke a specific unit test file, just pass the filename as a parameter. (wildcards also work, e.g. `pytest tests/unit/*_stack_*`).
```
pytest tests/unit/<test_filename>
```
