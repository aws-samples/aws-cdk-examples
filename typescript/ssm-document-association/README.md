# SSM Document Association

<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This example is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.
---
<!--END STABILITY BANNER-->

## Overview

An example that shows how to create an SSM document and associate it with targets that meet certain conditions — in this case, based on a tag and value. Additionally, an EC2 instance is deployed with this specific tag-value combination, so the document will be executed on that instance. The document will write the current timestamp to a file on the instance every 30 minutes.

## How it works

1. SSM Document is created with a command to write the current timestamp to a file.
2. SSM Document Association is created with a target tag, parameter, and schedule.
3. An EC2 instance is created with the same tag-value combination as the SSM Document Association target.
4. You can connect to the EC2 instance using AWS Session Manager.
5. Verify the existence of the file with the timestamp.


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
✅  SsmDocumentAssociationStack

✨  Deployment time: 175.86s

Outputs:
SsmDocumentAssociationStack.DocumentName = WriteTimeToFile
SsmDocumentAssociationStack.InstanceId = <INSTANCE_ID>
Stack ARN: <STACK_ARN>

✨  Total time: 67.29s
```

## Try it out

1. Deploy the stack and connect to the EC2 instance using AWS Session Manager. 

2. Verify the existence of the file with the timestamp.

```bash
$ ls /opt/aws/time_records/
time_20250414_195134.txt
$ cat /opt/aws/time_records/time_20250414_195134.txt
Mon Apr 14 19:51:34 UTC 2025
```

3. Try again, 30 minutes later, and see the new file created.

```bash
$ ls /opt/aws/time_records/
time_20250414_195134.txt  time_20250414_201930.txt
$ cat /opt/aws/time_records/time_20250414_201930.txt
Mon Apr 14 20:19:30 UTC 2025
```


## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
