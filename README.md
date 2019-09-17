# AWS CDK Examples

This repository contains a set of example projects for the [AWS Cloud Development
Kit](https://github.com/awslabs/aws-cdk). Some examples are only available in TypeScript, there is a guide on how to read TypeScript code and translate it to Python [here](https://docs.aws.amazon.com/cdk/latest/guide/multiple_languages.html).

## Table of Contents
1. [TypeScript examples](#TypeScript)
2. [Java examples](#Java)
3. [Python examples](#Python)
4. [JavaScript examples](#JavaScript)

## TypeScript examples <a name="TypeScript"></a>

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
| [api-cors-lambda-crud-dynamodb](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/api-cors-lambda-crud-dynamodb/) | Creating a single API with CORS, and five Lambdas doing CRUD operations over a single DynamoDB |
| [application-load-balancer](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/application-load-balancer/) | Using an AutoScalingGroup with an Application Load Balancer |
| [appsync-graphql-dynamodb](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/appsync-graphql-dynamodb/) | Creating a single GraphQL API with an API Key, and four Resolvers doing CRUD operations over a single DynamoDB |
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
| [ecs-service-with-logging](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/ecs/ecs-service-with-logging/) | Starting a container fronted by a load balancer on ECS |
| [fargate-service-with-logging](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/ecs/fargate-service-with-logging/) | Starting a container fronted by a load balancer on Fargate |

## Java examples <a name="Java"></a>

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
| [lambda-cron](https://github.com/aws-samples/aws-cdk-examples/tree/master/java/lambda-cron/) | Running a Lambda on a schedule |

## Python examples <a name="Python"></a>

To run a Python example, say my-widget-service:

```
$ npm install -g aws-cdk
$ cd python/my-widget-service
$ pip install -r requirements.txt    # Best to do this in a virtualenv
$ cdk deploy                         # Deploys the CloudFormation template

# Afterwards
$ cdk destroy
```

| Example | Description |
|---------|-------------|
| [api-cors-lambda](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/api-cors-lambda/) | Shows creation of Rest API (GW) with an /example GET endpoint, with CORS enabled |
| [application-load-balancer](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/application-load-balancer/) | Using an AutoScalingGroup with an Application Load Balancer |
| [classic-load-balancer](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/classic-load-balancer/) | Using an AutoScalingGroup with a Classic Load Balancer |
| [custom-resource](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/custom-resource/) | Shows adding a Custom Resource to your CDK app |
| [ecs-cluster](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/ecs/cluster/) | Provision an ECS Cluster with custom Autoscaling Group configuration |
| [ecs-load-balanced-service](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/ecs/ecs-load-balanced-service/) | Starting a container fronted by a load balancer on ECS |
| [ecs-service-with-task-placement](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/ecs/ecs-service-with-task-placement/) | Starting a container ECS with task placement specifications |
| [ecs-service-with-advanced-alb-config](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/ecs/ecs-service-with-advanced-alb-config/) | Starting a container fronted by a load balancer on ECS with added load balancer configuration |
| [ecs-service-with-task-networking](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/ecs/ecs-service-with-task-networking/) | Starting an ECS service with task networking, allowing ingress traffic to the task but blocking for the instance |
| [fargate-load-balanced-service](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/ecs/fargate-load-balanced-service/) | Starting a container fronted by a load balancer on Fargate |
| [fargate-service-with-autoscaling](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/ecs/fargate-service-with-autoscaling/) | Starting an ECS service of FARGATE launch type that auto scales based on average CPU Utilization |
| [lambda-cron](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/lambda-cron/) | Running a Lambda on a schedule |
| [lambda-s3-trigger](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/lambda-s3-trigger/) | S3 trigger for Lambda |
| [stepfunctions](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/stepfunctions/) | A simple StepFunctions workflow |
| [url-shortner](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/url-shortener) | Demo from the [Infrastructure ***is*** Code with the AWS CDK](https://youtu.be/ZWCvNFUN-sU) AWS Online Tech Talk |

## JavaScript examples <a name="JavaScript"></a>

Select the following link to see how to install and run the example.

| Example | Description |
|---------|-------------|
| [aws-cdk-changelogs-demo](https://github.com/aws-samples/aws-cdk-changelogs-demo) | A full serverless Node.js application stack deployed using CDK. It uses AWS Lambda, AWS Fargate, DynamoDB, Elasticache, S3, and CloudFront. |

# License

This library is licensed under the Apache 2.0 License.
