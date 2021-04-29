# .NET Examples

![Language-Support: Stable](https://img.shields.io/badge/language--support-stable-success.svg?style=for-the-badge)

This section contains all the CDK code examples written in .NET. At the moment, the CDK only supports .NET Core projects. For more information on using the CDK in .NET, please see the [Developer Guide](https://docs.aws.amazon.com/cdk/latest/guide/work-with-cdk-csharp.html).

## Running Examples

To run a .NET example, execute the following:

```
$ npm install -g aws-cdk
$ cd csharp/EXAMPLE_DIRECTORY
$ cdk deploy
```

Then, to dispose of the stack afterwards:

```
$ cdk destroy
```

## Table of Contents

| Example | Description |
|---------|-------------|
| [my-widget-service](https://github.com/aws-samples/aws-cdk-examples/tree/master/csharp/my-widget-service/) | Use Lambda to serve up widgets |
| [random-writer](https://github.com/aws-samples/aws-cdk-examples/tree/master/csharp/random-writer/) | This sample application demonstrates some essential mechanisms of the AWS CDK for .NET. It uses AWS Lambda, DynamoDB, CloudWatch. |
