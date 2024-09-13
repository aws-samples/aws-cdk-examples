# Amazon Connect

<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This example is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.
---
<!--END STABILITY BANNER-->

## Overview

This is an example CDK application that deploys an Amazon Connect instance.

**Use Case**: a customer wants to be able to provision and configure Amazon Connect instances using CDK in Python.

## Solution

The solution deploys an Amazon Connect instance along with S3 buckets for call recordings and scheduled reports.
Moreover, a Firehose Delivery Stream is deployed for Contact Trace Records.

The instance is then assigned a phone number and the hours of operation for the contact centre are configured.

## CDK Toolkit

The `cdk.json` file tells the CDK Toolkit how to execute your app.

This project is set up like a standard Python project.  The initialization
process also creates a virtualenv within this project, stored under the `.venv`
directory.  To create the virtualenv it assumes that there is a `python3`
(or `python` for Windows) executable in your path with access to the `venv`
package. If for any reason the automatic creation of the virtualenv fails,
you can create the virtualenv manually.

To manually create a virtualenv on MacOS and Linux:

```
$ python3 -m venv .venv
```

After the init process completes and the virtualenv is created, you can use the following
step to activate your virtualenv.

```
$ source .venv/bin/activate
```

If you are a Windows platform, you would activate the virtualenv like this:

```
% .venv\Scripts\activate.bat
```

Once the virtualenv is activated, you can install the required dependencies.

```
$ pip install -r requirements.txt
```

At this point you can now synthesize the CloudFormation template for this code.

```
$ cdk synth
```

To add additional dependencies, for example other CDK libraries, just add
them to your `setup.py` file and rerun the `pip install -r requirements.txt`
command.


## Deploying the solution

To deploy the solution, use the following command:

```shell
$ cdk deploy --all
```

## Destroying the deployment

To destroy the provisioned infrastructure, you can simply run the following command:

```shell
$ cdk destroy --all
```
