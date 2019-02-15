# AWS CDK Examples

This repository contains a set of example projects for the [AWS Cloud Development
Kit](https://github.com/awslabs/aws-cdk).

## TypeScript examples

To run the TypeScript examples:

```
$ npm install -g aws-cdk
$ npm install
$ npm run build
$ cdk deploy  // Deploys the Cloudformation template

# Afterwards
$ cdk destroy
```

| Example | Description |
|---------|-------------|
| [application-load-balancer](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/application-load-balancer/) | Using an AutoScalingGroup with an Application Load Balancer |
| [chat-app](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/chat-app/) | A serverless chat application using Cognito |
| [classic-load-balancer](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/classic-load-balancer/) | Using an AutoScalingGroup with a Classic Load Balancer |
| [custom-resource](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/custom-resource/) | Shows adding a Custom Resource to your CDK app |
| [ecs-cluster](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/ecs/cluster/) | Provision an ECS Cluster with custom Autoscaling Group configuration |
| [ecs-load-balanced-service](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/ecs/ecs-load-balanced-service/) | Starting a container fronted by a load balancer on ECS |
| [ecs-service-with-advanced-alb-config](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/ecs/ecs-service-with-advanced-alb-config/) | Starting a container fronted by a load balancer on ECS with added load balancer configuration |
| [fargate-load-balanced-service](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/fargate-load-balanced-service/) | Starting a container fronted by a load balancer on Fargate |
| [lambda-cron](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/lambda-cron/) | Running a Lambda on a schedule |
| [my-widget-service](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/my-widget-service/) | Use Lambda to serve up widgets |
| [resource-overrides](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/resource-overrides/) | Shows how to override generated CloudFormation code |
| [static-site](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/static-site/) | A static site using CloudFront |
| [stepfunctions-job-poller](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/stepfunctions-job-poller/) | A simple StepFunctions workflow |

## Java examples

To run the Java examples:

```
$ npm install -g aws-cdk
$ mvn compile
$ cdk deploy

# Afterwards
$ cdk destroy
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
