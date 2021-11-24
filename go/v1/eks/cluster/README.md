# EKS Cluster

This is an example of how to provision EKS cluster with CDK.

**NOTICE**: Go support is still in Developer Preview. This implies that APIs may
change while we address early feedback from the community. We would love to hear
about your experience through GitHub issues.

## Architecture Outline

Our cluster is comprised out of the following components:

- Dedicated VPC.
- EKS Cluster.
- AutoScalingGroup of on-demand instances that are used as the EKS self-managed nodes.
- Dedicated IAM Role for the AutoScalingGroup.

## Useful commands

 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk destroy`     destroy this stack from your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
 * `go test`         run unit tests
