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
| [ecs-load-balanced-fargate-service](typescript/ecs-load-balanced-fargate-service) | Starting a container fronted by a load balancer on ECS |
| [fargate-load-balanced-fargate-service](typescript/fargate-load-balanced-fargate-service) | Starting a container fronted by a load balancer on Fargate |

## Java examples

To run the Java examples:

```
$ npm install -g aws-cdk
$ mvn compile
$ cdk synth
```

| Example | Description |
|---------|-------------|
| [hello-world](java/hello-world) | A demo application that uses the CDK in Java |


# License

This library is licensed under the Apache 2.0 License.
