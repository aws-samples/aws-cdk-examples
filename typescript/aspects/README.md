# AWS CDK Aspects Example
<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This example is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.
---
<!--END STABILITY BANNER-->
Aspects is a CDK feature that allows developers to perform bulk operations across all constructs in a scope. They are useful for reporting, security scanning, and bulk customizations to resources.

In this example, we will use an aspect to apply a default value for the ReservedConcurrentExecutions property of any lambda function in a construct. We will also log the construct paths visited and actions taken.

While we use Aspects for bulk customizations in this example, it is best practice to apply customizations to resources via extension/configuration of constructs directly whenever possible.

The code in this project is not intended for production use.

## Setup
```
#Install the cdk
npm install -g aws-cdk

#Switch to the project and install node modules
cd typescript/aspects
npm install
```

## Review Aspect Behavior
1. Review the code in the lib folder, specifically in the lib/lambda-aspect.ts file to get an idea of the Aspect's implementation. Code comments are provided for context.
2. Run `cdk list` and view on console output to see the Aspect's behavior
2. Run `cdk synth SampleStack` and view the template to see the customizations

