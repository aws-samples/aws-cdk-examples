# Application Load Balancer


<!--BEGIN STABILITY BANNER-->

---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This example is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.

---
<!--END STABILITY BANNER-->

This example creates an AutoScalingGroup (containing 2 AWS Graviton2 Micro-T4G EC2 machines running the Amazon Linux 2023 AMI), and an ApplicationLoadBalancer inside a shared VPC.
It hooks up an open listener from the Load Balancer to the Scaling Group to indicate how many targets to balance between.

For more info on using Auto Scaling with Load Balancing see the AWS guide [here](https://docs.aws.amazon.com/autoscaling/ec2/userguide/autoscaling-load-balancer.html).

## Build

To build this example, you need to be in this example's root directory.
Then, run the following:

```bash
  npm install -g aws-cdk
  npm install
  cdk synth
```

This will install the necessary CDK, then this example's dependencies, and then build the CloudFormation template.
The resulting CloudFormation template will be in the `cdk.out` directory.

## Deploy

Run `cdk deploy`.
This will deploy / redeploy the stack to AWS.
After a successful deployment, the URL of the ALB created will be available in the output of the terminal console.
At this point, the ALB URL can be used for testing.
Copy the ALB URL and paste it in the address bar of a browser.
The ALB will route the received requests between the 2 EC2 instances created initially by the ASG.
You can observe that the requests made reach different EC2 instances.
This can be observed based on the content of the web page displayed in the browser (the hello message on the web page contains the host which is different for each EC2 instance).

## Useful commands

 * `mvn package`     compile and run tests
 * `cdk ls`          list all stacks in the app
 * `cdk synth`       emits the synthesized CloudFormation template
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk docs`        open CDK documentation
