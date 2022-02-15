# AWS CDK Examples

This repository contains a set of example projects for the [AWS Cloud Development
Kit](https://github.com/awslabs/aws-cdk).

## Table of Contents
1. [About this Repo](#About)
2. [Examples](#Examples)
3. [Learning Resources](#Learning)
4. [Additional Examples](#AddEx)
4. [License](#License)

## About this Repo <a name="About"></a>
This repo is our official list of CDK example code. The repo is subdivided into sections for each language (see ["Examples"](#Examples)). Each language has its own subsection of examples with the ultimate aim of complete language parity (same subset of examples exist in each language). These examples each provide a demonstration of a common service implementation, or infrastructure pattern that could be useful in your use of the CDK for building your own infrastructure.

We welcome contributions to this repo in the form of fixes to existing examples or addition of new examples. For more information on contributing, please see the [CONTRIBUTING](https://github.com/aws-samples/aws-cdk-examples/blob/master/CONTRIBUTING.md) guide.

This is considered an intermediate learning resource and should typically be referenced after reading the Developer Guide or CDK Workshop (please see [Learning Resources](#Learning) for more information on these resources).

## Examples <a name="Examples"></a>
This repo contains examples in each language supported by the CDK. Some languages are fully supported by [JSII](https://github.com/aws/jsii), but as additional languages are added, you will see those marked as `Developer Preview`. You can find the examples for each of those languages at the following links:

| Language | JSII Language-Stability |
|----------|-------------------------|
| [Typescript Examples](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript) | _Stable_ |
| [Python Examples](https://github.com/aws-samples/aws-cdk-examples/tree/master/python) | _Stable_ |
| [.NET Examples](https://github.com/aws-samples/aws-cdk-examples/tree/master/csharp) | _Stable_ |
| [Java Examples](https://github.com/aws-samples/aws-cdk-examples/tree/master/java) | _Stable_ |
| [Go Examples](https://github.com/aws-samples/aws-cdk-examples/tree/master/go) | _Stable_ |


## Learning Resources <a name="Learning"></a>
While this is an excellent learning resource for the CDK, there are other resources that can be referenced to assist with your learning/development process.

### Official Resources
- [Developer Guide](https://docs.aws.amazon.com/cdk/latest/guide/home.html)
- [API Reference](https://docs.aws.amazon.com/cdk/api/latest/docs/aws-construct-library.html)
- [CDK Workshop](https://cdkworkshop.com/)
- [CDK Repository](https://github.com/aws/aws-cdk)

### Unofficial/Community Resources
- [AwesomeCDK](https://github.com/kolomied/awesome-cdk)

> If you have created a CDK learning resource and would like it to be listed here, please read the related [CONTRIBUTING](https://github.com/aws-samples/aws-cdk-examples/blob/master/CONTRIBUTING.md#Resources) section for more info.

## Additional Examples <a name="AddEx"></a>

The examples listed below are larger examples hosted in their own repositories that demonstrate more complex or complete CDK applications. 
>If you would like your repo to be listed here, please read the [CONTRIBUTING](https://github.com/aws-samples/aws-cdk-examples/blob/master/CONTRIBUTING.md#Resources) guide for more details.

| Example | Description | Owner |
|---------|-------------|-------|
| [aws-cdk-changelogs-demo](https://github.com/aws-samples/aws-cdk-changelogs-demo) | A full serverless Node.js application stack deployed using CDK. It uses AWS Lambda, AWS Fargate, DynamoDB, Elasticache, S3, and CloudFront. | AWS |


# License <a name="License"></a>

This library is licensed under the Apache 2.0 License.
