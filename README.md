# AWS CDK Examples

This repository contains a set of example projects for the [AWS Cloud Development
Kit](https://github.com/awslabs/aws-cdk).

## TypeScript examples

To run a TypeScript example, say my-widget-service:

```
$ npm install -g aws-cdk
$ cd typescript/my-widget-service
$ npm install
$ npm run build
$ cdk deploy  // Deploys the CloudFormation template

# Afterwards
$ cdk destroy
```

| Example | Description |
|---------|-------------|
| [application-load-balancer](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/application-load-balancer/) | Using an AutoScalingGroup with an Application Load Balancer |
| [chat-app](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/chat-app/) | A serverless chat application using Cognito |
| [classic-load-balancer](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/classic-load-balancer/) | Using an AutoScalingGroup with a Classic Load Balancer |
| [custom-resource](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/custom-resource/) | Shows adding a Custom Resource to your CDK app |
| [elasticbeanstalk](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/elasticbeanstalk/) | Elastic Beanstalk example using L1 with a Blue/Green pipeline (community contributed) |
| [ecs-cluster](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/ecs/cluster/) | Provision an ECS Cluster with custom Autoscaling Group configuration |
| [ecs-load-balanced-service](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/ecs/ecs-load-balanced-service/) | Starting a container fronted by a load balancer on ECS |
| [ecs-service-with-task-placement](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/ecs/ecs-service-with-task-placement/) | Starting a container ECS with task placement specifications |
| [ecs-service-with-advanced-alb-config](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/ecs/ecs-service-with-advanced-alb-config/) | Starting a container fronted by a load balancer on ECS with added load balancer configuration |
| [ecs-service-with-task-networking](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/ecs/ecs-service-with-task-networking/) | Starting an ECS service with task networking, allowing ingress traffic to the task but blocking for the instance |
| [fargate-load-balanced-service](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/ecs/fargate-load-balanced-service/) | Starting a container fronted by a load balancer on Fargate |
| [fargate-service-with-auto-scaling](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/ecs/fargate-service-with-auto-scaling/) | Starting an ECS service of FARGATE launch type that auto scales based on average CPU Utilization |
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

## JavaScript examples

- [aws-cdk-changelogs-demo](https://github.com/aws-samples/aws-cdk-changelogs-demo) - A full serverless Node.js application stack deployed using CDK. It uses AWS Lambda, AWS Fargate, DynamoDB, Elasticache, S3, and CloudFront.

# License

This library is licensed under the Apache 2.0 License.
