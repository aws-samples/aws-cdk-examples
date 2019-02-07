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

# FAQ

* **What do I do with cdk.json**?

These examples come with a `cdk.json` that specifies the entry point for the CDK application.
Many of the examples will access your AWS account to determine availability zones or AMI IDs,
and will save the results of that back to `cdk.json` under the `"context"` key.

In a production application, you would check in the changes to `cdk.json` to ensure you have
a repeatable build that doesn't access the network. For these example applications, ignore
or unstage the changes.


# License

This library is licensed under the Apache 2.0 License.
