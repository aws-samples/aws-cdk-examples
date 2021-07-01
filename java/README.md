# Java Examples

![Language-Support: Stable](https://img.shields.io/badge/language--support-stable-success.svg?style=for-the-badge)

This section contains all the CDK code examples written in Java. To manage CDK packages in Java we use [Apache Maven](https://maven.apache.org/) (packages managed on [Central Repository](https://search.maven.org/)). For more information on using the CDK in Java, please see the [Developer Guide](https://docs.aws.amazon.com/cdk/latest/guide/work-with-cdk-java.html).

## Running Examples

To run a Java examples, execute the following:

```
$ npm install -g aws-cdk
$ cd java/EXAMPLE_DIRECTORY
$ cdk deploy
```

Then, to dispose of the stack afterwards:

```
$ cdk destroy
```

## Table of Contents

| Example | Description |
|---------|-------------|
| [fargate-load-balanced-service](https://github.com/aws-samples/aws-cdk-examples/tree/master/java/ecs/fargate-load-balanced-service/) | Starting a container fronted by a load balancer on Fargate |
| [hello-world](https://github.com/aws-samples/aws-cdk-examples/tree/master/java/hello-world/) | A demo application that uses the CDK in Java |
| [lambda-cron](https://github.com/aws-samples/aws-cdk-examples/tree/master/java/lambda-cron/) | Running a Lambda on a schedule |
| [resource-overrides](https://github.com/aws-samples/aws-cdk-examples/tree/master/java/resource-overrides/) | Use of the resource overrides (aka ["escape hatch"](https://docs.aws.amazon.com/cdk/latest/guide/cfn_layer.html)) mechanism. |
| [stepfunctions-job-poller](https://github.com/aws-samples/aws-cdk-examples/tree/master/java/stepfunctions-job-poller/) | A simple StepFunctions workflow |
| [static-site](https://github.com/aws-samples/aws-cdk-examples/tree/master/java/static-site/) | A static site using CloudFront |
| [api-cors-lambda-crud-dynamodb](https://github.com/aws-samples/aws-cdk-examples/tree/master/java/api-cors-lambda-crud-dynamodb/) | Creating a single API with CORS, and five Lambdas doing CRUD operations over a single DynamoDB |
| [classic-load-balancer](https://github.com/aws-samples/aws-cdk-examples/tree/master/java/classic-load-balancer/) | Using an AutoScalingGroup with a Classic Load Balancer |
