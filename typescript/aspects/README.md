# AWS CDK Aspects Example
<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This example is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.
---
<!--END STABILITY BANNER-->
This project shows how to create a custom Aspect to perform bulk customizations against a stack.
In this example, we will use as aspect to apply a default value for the ReservedConcurrentExecutions property of any lambda function in a construct.

While Aspects is a nice feature for the CDK, I would recommend that you use it as a last resort. Construct customizations should be applied via extension of existing constructs in TypeScript rather than escape hatches whenever possible.

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

