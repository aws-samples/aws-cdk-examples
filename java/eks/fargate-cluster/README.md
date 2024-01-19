<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This example is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to
> build.

---
<!--END STABILITY BANNER-->

# CDK Java Example

This is an example of a CDK program written in Java.\
CDK program contains code to deploy an EKS cluster supported by Fargate containers.\
The cluster will be hosted on a declared VPC and pods residing in ```kube-system```, ```app-*``` and ```default```
namespaces will automatically be launched into Fargate containers.

## CDK Toolkit

The [`cdk.json`](./cdk.json) file in the root of this repository includes
instructions for the CDK toolkit on how to execute this program.

Specifically, it will tell the toolkit to use the `mvn exec:java` command as the
entry point of your application. After changing your Java code, you will be able
to run the CDK toolkit commands as usual (Maven will recompile as needed):

    $ cdk ls
    <list all stacks in this program>

    $ cdk synth
    <cloudformation template>

    $ cdk deploy
    <deploy stack to your account>

    $ cdk diff
    <diff against deployed stack>

## Deploying the solution

To deploy the solution, we will need to request cdk to deploy the two stacks: `VpcStack` and `EksFargateStack`:

```shell
$ cdk deploy --all
```

After that, as an output, the cdk will inform you how to get access to the cluster as seen bellow:

```shell
EksFargateStack.EksFargateClusterConfigCommandBECF48D5 = aws eks update-kubeconfig --name SampleCluster --region us-east-1 --role-arn arn:aws:iam::<YOUR-ACCOUNT-ID>:role/EksClusterAdminRole
EksFargateStack.EksFargateClusterGetTokenCommand3C7DCA2A = aws eks get-token --cluster-name SampleCluster --region us-east-1 --role-arn arn:aws:iam::<YOUR-ACCOUNT-ID>:role/EksClusterAdminRole
```

Don't forget to add `EksClusterAdminRole` to the IAM group related to the cluster administrator.

You can now execute `kubectl` commands connecting to the deployed cluster.

### Testing the cluster

You can check the cluster readiness by deploying a simple application, or make use of
the [`app-manifest.yaml`](./app-manifest.yaml) file like the bellow following command:

```shell
$ kubectl apply -f app-manifest.yaml

namespace/app-namespace created
pod/poc-app1 created
pod/poc-app2 created
```

You will be able to interact with the two deployed pods.

## Destroying the deployment

To destroy the provisioned infrastructure, you can simply run the following command:

```shell
$ cdk destroy --all
```
