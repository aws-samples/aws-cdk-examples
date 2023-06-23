Amazon OpenSearch Service
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

This project demonstrates how to set up Amazon OpenSearch Service domain in a VPC. Along with OpenSearch Service domain it also launches an EC2 instance to run nginx proxy for accessing OpenSearch Dashboards.

Once deployed, it will setup and configure Index template, Index State Management Policies, Alerts and import sample Dashboard.


## Build and Deploy

The `cdk.json` file tells the CDK Toolkit how to execute your app.


### Bootstrap the environment

This project is set up like a standard Python project. The initialization process also creates a virtualenv within this
project, stored under the `.env` directory. To create the virtualenv it assumes that there is a `python3` (or `python`
for Windows) executable in your path with access to the `venv` package.
Run below command to create a virtualenv on MacOS and Linux.

```
$ bash bootstrap.sh
```

After the bootstrap process completes and the virtualenv is created, you can use the following step to activate your virtualenv.

```
$ source .env/bin/activate
```

If you are a Windows platform, you would activate the virtualenv like this:

```
% .env\Scripts\activate.bat
```

At this point you can now synthesize the CloudFormation template for this code.

```
$ cdk synth
```

### CDK Deploy

At this point you can deploy the stack to create OpenSearch Service domain, an EC2 instance and setup nginx proxy along with alerts, Index template and dashboards.

```
$ cdk deploy
```

### CDK Destroy

If no longer want the stack to be running, you can destroy the stack by running the following command.

```
$ cdk destroy
```

