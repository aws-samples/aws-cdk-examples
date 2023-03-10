# ECS Cluster With Application Load Balancer (ALB)

This AWS CDK Go sample demonstrates how to configure and deploy an Elastic Container Service (ECS) Cluster behind an Application Load Balancer (ALB).

This is useful because traffic will not directly hit the ECS cluster; rather, it will need to go through the ALB to access the application.

## Deploying

- Authenticate to your AWS account from your terminal.
- Navigate to this directory.
- `cdk synth` to review the CloudFormation template.
- `cdk diff` to compare changes with what's currently deployed.
- `cdk deploy` to deploy the stack to the AWS account you're authenticated to.

## Testing

- CDK will output the ALB endpoint. Copy/paste it into the browser to check that the application is running.
  - e.g. `http://EcsClusterALB-xxxxxxxxx.us-east-1.elb.amazonaws.com`
- Navigate to the AWS console and view the services that were deployed in the ECS (Service, Task Definition, Tasks, etc) and EC2 (Load Balancer, Target Groups, etc), consoles.
