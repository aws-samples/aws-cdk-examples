# TypeScript Examples

![Language-Support: Stable](https://img.shields.io/badge/language--support-stable-success.svg?style=for-the-badge)

This section contains all the CDK code examples written in Typescript. For more information on using the CDK in Typescript, please see the [Developer Guide](https://docs.aws.amazon.com/cdk/latest/guide/work-with-cdk-typescript.html).

## Running Examples

To run a Typescript example, execute the following:

```sh
$ npm install -g aws-cdk
$ cd typescript/EXAMPLE_DIRECTORY
$ npm install
$ cdk deploy
```

Then, to dispose of the stack/s afterwards

```
$ cdk destroy
```

## Table of Contents

| Example | Description |
|---------|-------------|
| [api-cors-lambda-crud-dynamodb](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/api-cors-lambda-crud-dynamodb/) | Creating a single API with CORS, and five Lambdas doing CRUD operations over a single DynamoDB |
| [api-websocket-lambda-dynamodb](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/api-websocket-lambda-dynamodb/) | Creating a websocket api with Lambdas, DynamoDB as messaging endpoint |
| [application-load-balancer](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/application-load-balancer/) | Using an AutoScalingGroup with an Application Load Balancer |
| [appsync-graphql-dynamodb](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/appsync-graphql-dynamodb/) | Creating a single GraphQL API with an API Key, and four Resolvers doing CRUD operations over a single DynamoDB |
| [aws-transfer-sftp-server](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/aws-transfer-sftp-server/) | Example for deploying AWS Transfer SFTP Server with public key authentication and IP address allowlist |
| [classic-load-balancer](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/classic-load-balancer/) | Using an AutoScalingGroup with a Classic Load Balancer |
| [custom-resource](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/custom-resource/) | Shows adding a Custom Resource to your CDK app |
| [ec2-ssm-local-zone](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/ec2-ssm-local-zone/) | EC2 deployment to AWS Local Zone with AWS Systems Manager support using AWS CDK |
| [elasticbeanstalk](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/elasticbeanstalk/) | Elastic Beanstalk example using L1 with a Blue/Green pipeline (community contributed) |
| [ecs-cluster](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/ecs/cluster/) | Provision an ECS Cluster with custom Autoscaling Group configuration |
| [ecs-network-load-balanced-service](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/ecs/ecs-network-load-balanced-service/) | Starting a container fronted by a network load balancer on ECS |
| [ecs-service-with-task-placement](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/ecs/ecs-service-with-task-placement/) | Starting a container ECS with task placement specifications |
| [ecs-service-with-advanced-alb-config](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/ecs/ecs-service-with-advanced-alb-config/) | Starting a container fronted by a load balancer on ECS with added load balancer configuration |
| [ecs-service-with-task-networking](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/ecs/ecs-service-with-task-networking/) | Starting an ECS service with task networking, allowing ingress traffic to the task but blocking for the instance |
| [fargate-application-load-balanced-service](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/ecs/fargate-application-load-balanced-service/) | Starting a container fronted by an application load balancer on Fargate |
| [fargate-service-with-auto-scaling](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/ecs/fargate-service-with-auto-scaling/) | Starting an ECS service of FARGATE launch type that auto scales based on average CPU Utilization |
| [ecs-cross-stack-load-balancer](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/ecs/cross-stack-load-balancer/) | Shows how to use a single load balancer with services in other stacks |
| [lambda-cron](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/lambda-cron/) | Running a Lambda on a schedule |
| [lambda-layer](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/lambda-layer/) | Running a Lambda with a lambda layer |
| [my-widget-service](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/my-widget-service/) | Use Lambda to serve up widgets |
| [resource-overrides](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/resource-overrides/) | Shows how to override generated CloudFormation code |
| [s3-object-lambda](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/s3-object-lambda/) | Creating an S3 Object Lambda and access point |
| [static-site](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/static-site/) | A static site using CloudFront |
| [stepfunctions-job-poller](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/stepfunctions-job-poller/) | A simple StepFunctions workflow |
| [ecs-service-with-logging](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/ecs/ecs-service-with-logging/) | Starting a container fronted by a load balancer on ECS |
| [fargate-service-with-logging](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/ecs/fargate-service-with-logging/) | Starting a container fronted by a load balancer on Fargate |
| [custom-logical-names](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/custom-logical-names/) | Example of how to override logical name allocation |
| [fargate-service-with-efs](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/ecs/fargate-service-with-efs/) | Starting a container fronted by an application load balancer on Fargate with an EFS Mount |
| [http-proxy-apigateway](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/http-proxy-apigateway/) | Use ApiGateway to set up a http proxy |
