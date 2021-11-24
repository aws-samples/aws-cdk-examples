# Neptune Cluster with a VPC
<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This examples is built only on the CDK core library, and does not have any infrastructure prerequisites to build.
---
<!--END STABILITY BANNER-->

* Creates a **VPC**, with **two subnets**, to run the **Neptune Cluster** in.
* Creates a **Neptune Cluster** inside the **Isolated Subnets**.
* Exports the endpoints for connecting to the cluster.

## Build

To build this example, you need to be in this example's root directory. Then run the following:

```bash
npm install -g aws-cdk
npm install
cdk synth
```

This will install the necessary CDK, then this example's dependencies, and then build the CloudFormation template. The resulting CloudFormation template will be in the `cdk.out` directory.

## Deploy

Run `cdk deploy`. This will deploy / redeploy your Stack to your AWS Account.

After the deployment you will see the API's URL, which represents the url you can then use.
