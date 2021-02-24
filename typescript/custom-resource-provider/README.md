# CDK Custom Resource Provider Example

This sample project demonstrates how to define a custom resource using the @aws-cdk/custom-resource package -- specifically the AWSCustomResource and Provider constructs.

From the [documentation](https://docs.aws.amazon.com/cdk/api/latest/docs/custom-resources-readme.html): The @aws-cdk/custom-resources.Provider construct is a "mini-framework" for implementing providers for AWS CloudFormation custom resources. The framework offers a high-level API which makes it easier to implement robust and powerful custom resources and includes the following capabilities:

* Handles responses to AWS CloudFormation and protects against blocked deployments
* Validates handler return values to help with correct handler implementation
* Supports asynchronous handlers to enable operations that require a long waiting period for a resource, which can exceed the AWS Lambda timeout
Implements default behavior for physical resource IDs


The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
