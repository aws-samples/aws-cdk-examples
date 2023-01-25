# Graviton EKS Cluster

This is an example of how to provision EKS cluster with AWS Graviton nodes with CDK.

<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This example is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.
---
<!--END STABILITY BANNER-->

## Requirements

Make sure the latest version of cdk cli is installed. Use the [link](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html#getting_started_install) to install latest version of aws cdk. 
Existing installations can be updated with below command

```
sudo  npm install -g aws-cdk@latest
```


Install go dependencies

```
go get -u ./...
```

## Architecture Outline

Our cluster is comprised out of the following components:

- Dedicated VPC.
- EKS Cluster.
- AWS Graviton instances as the EKS self-managed nodes.
- AWS application loadbalancer ingress controller enabled.

## Useful commands

 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk destroy`     destroy this stack from your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
 * `go test`         run unit tests


```
