# AWS CDK Examples

This repository contains a set of example projects for the [AWS Cloud Development
Kit](https://github.com/awslabs/aws-cdk).

## TypeScript examples

To run the TypeScript examples:

```
$ npm install -g aws-cdk
$ npm install
$ npm build
$ cdk synth
```

| Example | Description |
|---------|-------------|
| [ecs-load-balanced-service](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/ecs-load-balanced-service/) | Starting a container fronted by a load balancer on ECS |
| [fargate-load-balanced-service](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/fargate-load-balanced-service/) | Starting a container fronted by a load balancer on Fargate |

## Java examples

To run the Java examples:

```
$ npm install -g aws-cdk
$ mvn compile
$ cdk synth
```

| Example | Description |
|---------|-------------|
| [hello-world](https://github.com/aws-samples/aws-cdk-examples/tree/master/java/hello-world/) | A demo application that uses the CDK in Java |


# License

This library is licensed under the Apache 2.0 License.
