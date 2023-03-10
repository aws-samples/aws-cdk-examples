# ECS Cluster With Application Load Balancer (ALB)

This AWS CDK Go sample demonstrates how to configure and deploy an Elastic Container Service (ECS) Cluster behind an Application Load Balancer (ALB).

This is useful because traffic will not directly hit the ECS cluster; rather, it will be routed through the ALB to access the application.

## Deploying

- Authenticate to your AWS account from your terminal.
- Navigate to this `cluster-alb` directory.
- `cdk synth` to generate and review the CloudFormation template.
- `cdk diff` to compare local changes with what is currently deployed.
- `go test` to run the tests we specify in `cluster-alb_test.go`.
- `cdk deploy` to deploy the stack to the AWS account you're authenticated to.

## Testing

- CDK will output the ALB endpoint. Copy/paste it into the browser to check that the application is running.
  - e.g. `http://EcsClusterALB-xxxxxxxxx.us-east-1.elb.amazonaws.com`
  - _Note: Be sure to prefix the ALB endpoint with `http://` as your browser may initially force `https`, which will not work as we are not issuing or installing an SSL certificate in this sample._
- Navigate to the AWS console and view the services that were deployed in the VPC (Subnets, Route Tables, etc), ECS (Cluster, Service, Task Definition, etc) and EC2 (Load Balancer, Target Groups, etc) consoles.
