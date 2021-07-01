# Python Examples

![Language-Support: Stable](https://img.shields.io/badge/language--support-stable-success.svg?style=for-the-badge)

This section contains all the CDK code examples written in Python. For more information on using the CDK in Python, please see the [Developer Guide](https://docs.aws.amazon.com/cdk/latest/guide/work-with-cdk-python.html).

## Running Examples

### To run example
1. Ensure CDK is installed
```
$ npm install -g aws-cdk
```

2. Create a Python virtual environment
```
$ python3 -m venv .venv
```

3. Activate virtual environment

_On MacOS or Linux_
```
$ source .venv/bin/activate
```

_On Windows_
```
% .venv\Scripts\activate.bat
```

4. Install the required dependencies.

```
$ pip install -r requirements.txt
```

5. Synthesize (`cdk synth`) or deploy (`cdk deploy`) the example

```
$ cdk deploy
```

### To dispose of the stack afterwards:

```
$ cdk destroy
```

## Table of Contents

| Example | Description |
|---------|-------------|
| [api-cors-lambda](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/api-cors-lambda/) | Shows creation of Rest API (GW) with an /example GET endpoint, with CORS enabled |
| [application-load-balancer](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/application-load-balancer/) | Using an AutoScalingGroup with an Application Load Balancer |
| [appsync-graphql-dynamodb](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/appsync-graphql-dynamodb/) | Creating a single GraphQL API with an API Key, and four Resolvers doing CRUD operations over a single DynamoDB |
| [classic-load-balancer](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/classic-load-balancer/) | Using an AutoScalingGroup with a Classic Load Balancer |
| [custom-resource](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/custom-resource/) | Shows adding a Custom Resource to your CDK app |
| [dockerized-app](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/docker-app-with-asg-alb/) | Deploys a containerized app into 3 tiers with userdata in an autoscaling group |
| [ecs-cluster](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/ecs/cluster/) | Provision an ECS Cluster with custom Autoscaling Group configuration |
| [ecs-load-balanced-service](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/ecs/ecs-load-balanced-service/) | Starting a container fronted by a load balancer on ECS |
| [ecs-service-with-task-placement](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/ecs/ecs-service-with-task-placement/) | Starting a container ECS with task placement specifications |
| [ecs-service-with-advanced-alb-config](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/ecs/ecs-service-with-advanced-alb-config/) | Starting a container fronted by a load balancer on ECS with added load balancer configuration |
| [ecs-service-with-task-networking](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/ecs/ecs-service-with-task-networking/) | Starting an ECS service with task networking, allowing ingress traffic to the task but blocking for the instance |
| [fargate-load-balanced-service](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/ecs/fargate-load-balanced-service/) | Starting a container fronted by a load balancer on Fargate |
| [fargate-service-with-autoscaling](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/ecs/fargate-service-with-autoscaling/) | Starting an ECS service of FARGATE launch type that auto scales based on average CPU Utilization |
| [lambda-cron](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/lambda-cron/) | Running a Lambda on a schedule |
| [lambda-s3-trigger](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/lambda-s3-trigger/) | S3 trigger for Lambda |
| [rds](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/rds/) | Creating a MySQL RDS database inside its dedicated VPC |
| [stepfunctions](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/stepfunctions/) | A simple StepFunctions workflow |
| [url-shortner](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/url-shortener) | Demo from the [Infrastructure ***is*** Code with the AWS CDK](https://youtu.be/ZWCvNFUN-sU) AWS Online Tech Talk |
| [ec2-instance](https://github.com/aws-samples/aws-cdk-examples/tree/master/python/ec2/instance/) | Create EC2 Instance in new VPC with Systems Manager enabled |

