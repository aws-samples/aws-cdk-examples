Lambda Layer
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

CDK example to create a Python Lambda that uses a Python [Lambda Layer](https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html).
The example demonstrates use of Lambda Layer Python folder structure, and use of L2 Constructs for deploying and using Lambda Layer with a function in CDK.


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

A Lambda layer is a .zip file archive that can contain additional code or data. When deployed, CDK creates a layer .zip
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
