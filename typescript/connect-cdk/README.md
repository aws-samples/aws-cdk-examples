# Amazon Connect fully deployed with CDK

<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This example is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.
---
<!--END STABILITY BANNER-->

## Overview

A fully infrastructure-as-code Amazon Connect solution that includes a simple call flow itegrated with Lambda.

## Solution

Some of the key services in use:
* Amazon Connect
* AWS Lambda

### Connect Call Flows
The following Connect flows/modules are found in the `callFlows`:
* `MainFlow.json` -- the main flow

***Modifying the json can be performed via the Connect user interface, followed by an export operation. Note that string replacements are performed prior to loading the json flows into the resource, they will need to be reset after exporting.  This is responsible for ARN and other dependency resolution and is contained to the contact attributes parameters.***

## Tagging
The follow tag is set for all taggable resources in `bin/connect_cdk_simple.ts`:
* `application: 'Github Location'`

## Deploying 

This project contains a Lambda function that use the CDK to deploy.  It is written in Python, but des not require any further building or packaging.

This project uses the Cloud Development Kit (CDK) in Typescript. 

```bash
cdk deploy
``` 

## Cleanup
To cleanup this solution or avoid further or on-going charges

```bash
cdk destroy
```