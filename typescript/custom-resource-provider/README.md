<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This example is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.
---
<!--END STABILITY BANNER-->

# CDK Custom Resource Provider Framework Example

This sample project demonstrates how to define a custom resource using the @aws-cdk/custom-resource package Provider framework.

From the [documentation](https://docs.aws.amazon.com/cdk/api/latest/docs/custom-resources-readme.html): The @aws-cdk/custom-resources.Provider construct is a "mini-framework" for implementing providers for AWS CloudFormation custom resources. The framework offers a high-level API which makes it easier to implement robust and powerful custom resources and includes the following capabilities:

* Handles responses to AWS CloudFormation and protects against blocked deployments
* Validates handler return values to help with correct handler implementation
* Supports asynchronous handlers to enable operations that require a long waiting period for a resource, which can exceed the AWS Lambda timeout
Implements default behavior for physical resource IDs

This example implements the same stack and 'custom resource' as the [custom resource](../custom-resource) example which itself used deprecated CustomResource and CustomResourceProvider from the @aws-cdk/aws-cloudformation package.

## Build

To build this app, you need to be in this example's root folder. Then run the following:

```bash
npm install -g aws-cdk
npm install
npm run build
```

This will install the necessary CDK, then this example's dependencies, and then build your TypeScript files and your CloudFormation template.

## Deployment

This stack uses assets, so the [toolkit stack must be deployed to the environment](https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html). This can be done by running the following command:

```bash
cdk bootstrap
```

At this point you can now synthesize the CloudFormation template for this code:

```bash
cdk synth
```

And proceed to deployment of the stack:

```bash
cdk deploy
```

## Important files

| Filename                                                                                   | Purpose                                                       | Notes                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [cdk.json](cdk.json)                                                                       | CDK app definition file                                       | The `cdk.json` file tells the CDK Toolkit how to execute your app.                                                                                                      |
| [my-custom-resource-provider-demo-stack.ts](lib/my-custom-resource-provider-demo-stack.ts) | The stack definition                                          | This is an exact copy of the example provided in [custom-resource](../custom-resource/index.ts)                                                                         |
| [my-custom-resource.ts](lib/my-custom-resource.ts)                                         | A construct that encapsulates the custom resource             | This is an implementation from the [provider framework](https://docs.aws.amazon.com/cdk/api/latest/docs/custom-resources-readme.html#provider-framework) documentation. |
| [custom-resource-handler.py](custom-resource-handler.py)                                   | The Lambda function definition of the custom provider handler | From the [provider framework](https://docs.aws.amazon.com/cdk/api/latest/docs/custom-resources-readme.html#provider-framework) documentation.                           |

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
