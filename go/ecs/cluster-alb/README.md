# ECS Cluster With Application Load Balancer (ALB)

## <!--BEGIN STABILITY BANNER-->

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This example is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.

---

<!--END STABILITY BANNER-->

## Overview

This AWS CDK Go sample demonstrates how to configure and deploy an Elastic Container Service (ECS) Cluster behind an Application Load Balancer (ALB).

## Real-world Example

When running a containerized application with multiple tasks in an ECS Cluster service, not exposing the service directly to the internet is part of security best practices. In this example, we deploy an Application Load Balancer (ALB) in front of the service to both balance traffic, and act as the single point of entry to the application.

## Deploying

- Authenticate to your AWS account from your terminal.
- Navigate to this `cluster-alb` directory.
- `cdk synth` to generate and review the CloudFormation template.
- `cdk diff` to compare local changes with what is currently deployed.
- `go test` to run the tests we specify in `cluster-alb_test.go`.
- `cdk deploy` to deploy the stack to the AWS account you're authenticated to.

## Testing

- CDK will output the ALB endpoint after a successful deployment. Copy / paste it into the browser to check that the application is running.

  - e.g. `http://EcsClusterALB-xxxxxxxxx.us-east-1.elb.amazonaws.com`
    - _Note: Be sure to prefix the ALB endpoint with `http://` as your browser may initially force `https`, which will not work as we are not issuing or installing an SSL certificate in this sample._
    - We know that this endpoint belongs to an AWS Load balancer as it contains `elb`, which stands for [Elastic Load Balancing](https://aws.amazon.com/elasticloadbalancing/).

- Confirming our ALB is in use:

  - Navigate to the AWS Console &rarr; EC2 &rarr; Load balancers.
  - Select the newly deployed ALB (in this example, it's named `EcsClusterALB`).
  - We should see that the `DNS name` matches what was in the terminal output after the `cdk deploy` was successful.
  - Towards the bottom of the page, we should see a `Listeners` section that forwards traffic to our ECS Cluster Target Group containing the EC2 instances.
  - Clicking on the `Monitoring` tab, we are able to visualize metrics related to the ALB.
  - For metrics related to the Target Groups and EC2 instances:
    - Click on the `Listeners` tab.
    - Under `Default routing rule`, click on the name of the target group.
    - Click on the `Monitoring` tab in the Target Groups console.

- Navigate to the AWS console to view the services that were deployed:
  - VPC (Subnets, Route Tables, etc.)
  - ECS (Cluster, Service, Task Definition, etc.)
  - EC2 (Load Balancer, Target Groups, etc.)

## Further Improvements

This example does not use an HTTPS listener. For improved security, HTTPS (TLS) is encouraged.

Some further improvements that can be made are:

- Enable TLS at the ALB by [creating an HTTPS listener](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-https-listener.html#add-https-listener).
- Route traffic to the ALB with a [custom Route 53 domain](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-elb-load-balancer.html).
- Protect your ALB from attacks and malicious traffic using [Web Application Firewall (WAF)](https://docs.aws.amazon.com/waf/latest/developerguide/waf-chapter.html).
- Use a [CloudFront Distribution to cache results](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ConfiguringCaching.html) returned from the application, reducing load on the containerized application overall.
