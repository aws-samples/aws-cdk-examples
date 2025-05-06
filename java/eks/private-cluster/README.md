<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This example is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.
---
<!--END STABILITY BANNER-->

# Build an EKS Private Cluster in Isolated Subnets with CDK

This is a CDK example in Java that creates a private EKS cluster isolated from the Internet. This CDK application deploys a VPC with only Isolated Subnets. There is no Internet Gateway, NAT Gateway, or any proxy to the internet in the VPC. The cluster will have one worker node to run the pods and one client EC2 instance for `kubectl`. The EC2 instances will be accessible through [AWS Systems Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/what-is-systems-manager.html). The private connection to the AWS services will be through [VPC Endpoints](https://docs.aws.amazon.com/whitepapers/latest/aws-privatelink/what-are-vpc-endpoints.html).

## Use cases
A private EKS cluster setup is commonly used in enterprise setup or highly regulated environments where there are strict requirements to not allow internet connectivity to the deployed workloads.

## Architecture diagram of the deployed resources

![eks-private-cluster-diagram](eks-private-cluster-diagram.png)

## VPC Endpoints for this stack
The cluster stack setup will create the following VPC endpoints.

1. S3 - `s3`
1. ECR - `ecr.api`, `ecr.dkr`
1. EC2 - `ec2`
1. EKS - `eks`
1. Security Token Service - `sts`
1. Cloudwatch - `logs`, `monitoring`
1. Systems Manager - `ec2messages`, `ssm`, `ssmmessages`
1. Lambda - `lambda`
1. Step Functions - `states`, `sync-states`

In the console, you will see Endpoints created in each Isolated subnet with the Service Name prefixed with `com.amazonaws.[region].` e.g. `com.amazonaws.ap-southeast-1.s3`.

The S3 endpoint is used to download the assets, artifacts, and tools stored in S3 buckets. The ECR endpoint is to pull container images in private repos and even in public repos in upstream registries via [ECR pull through caches](https://docs.aws.amazon.com/AmazonECR/latest/userguide/pull-through-cache.html). The EC2 endpoint is used to call the EC2 services when creating the worker nodes and client instance. The EKS endpoint is to call the EKS API for cluster creation. The CloudWatch endpoints are for logging and monitoring. The Lambda and Step Function endpoints are required by the Custom Resource cluster handler of CDK in creating the EKS cluster.

Also see the required endpoints for Systems Manager [here](https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html#sysman-setting-up-vpc-create).

After deployment, as you add applications to the cluster requiring other services, you will need to add their respective VPC endpoints. The full list can be found [here](https://docs.aws.amazon.com/vpc/latest/privatelink/aws-services-privatelink-support.html).

> Note that you will be billed for each hour that your VPC endpoint remains provisioned in each Availability Zone. Data processing charges also apply. Please refer to its pricing [here](https://aws.amazon.com/privatelink/pricing/).

## Build and deploy 
1. Go the root directory of this example
    ```
    cd ./eks-private-cluster
    ```
1. Synthesize the code
    ```
    cdk synth
    ```
1. Deploy
    ```
    cdk deploy
    ```
    This will take about 25 mins. It includes the creation of the EKS cluster, the VPC endpoints, and the Lambda functions required by CDK to monitor the cluster lifecycle. The functions are deployed in the VPC and is configured in the cluster's `placeClusterHandlerInVpc` set to `true`. See the [EKS Construct Library](https://docs.aws.amazon.com/cdk/api/v2/java/software/amazon/awscdk/services/eks/package-summary.html) for more details.
1. After a successful deployment, note the output of CDK on the cluster's name, the `kubeconfig` settings, the `kubectl-client` instance id, and the master IAM role of the cluster.

    __Example output:__
    ```
    Outputs:
    EksPrivateCluster.eksClusterNameXXXXXXXX = eks-private
    EksPrivateCluster.eksConfigCommandXXXXXXXX = aws eks update-kubeconfig --name eks-private --region ap-southeast-1 --role-arn arn:aws:iam::111111111111:role/EksPrivateCluster-clusteradminxxxxxxxx-xxxxxxxxxxxx
    EksPrivateCluster.eksGetTokenCommandXXXXXXXX = aws eks get-token --cluster-name eks-private --region ap-southeast-1 --role-arn arn:aws:iam::111111111111:role/EksPrivateCluster-clusteradminxxxxxxxx-xxxxxxxxxxxx 
    EksPrivateCluster.eksMastersRoleArnXXXXXXXX = arn:aws:iam::111111111111:role/EksPrivateCluster-clusteradminxxxxxxxx-xxxxxxxxxxxx
    EksPrivateCluster.kubectlclientBastionHostXXXXXXXX = i-000000000aaaaaaaa
    ```

## Accessing the EC2 instances with AWS Systems Manager Session Manager
1. Login to the AWS Console and go to the EC2 Service. Find and select the instance created by CDK with the name `kubectl-client`. Click `Connect`. Choose `Session Manager.`
1. Optional. Update the [Session Manager Preferences](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-preferences-shell-config.html) to use bash and set alias for kubectl.
    ```
    /bin/bash
    alias k=kubectl
    export AWS_STS_REGIONAL_ENDPOINTS=regional
    cd $HOME
    ```

## Installing tools and packages
### Docker
Amazon Linux repositories are hosted in Amazon Simple Storage Service (Amazon S3) buckets. Installing or updating packages from these repositories will work even in an isolated environment. See this [AWS re:Post entry](https://repost.aws/knowledge-center/ec2-al1-al2-update-yum-without-internet). The CDK we just deployed used Amazon Linux instances and has an S3 VPC gateway endpoint. For example, we can access this repository to install docker.

```
sudo yum update -y
sudo amazon-linux-extras install docker
sudo service docker start
```

### kubectl
For other packages or tools like `kubectl`, create an S3 bucket accessible from the isolated environment to store these assets. You can use [AWS CloudShell](https://aws.amazon.com/cloudshell/) to download the assets and upload them in the asset bucket. Follow the steps [here](https://docs.aws.amazon.com/eks/latest/userguide/install-kubectl.html) to install `kubectl` in the `kubectl-client` instance.

Sample cloudshell session:

```
[cloudshell-user@ip-10-2-84-204 ~]$ curl -O https://s3.us-west-2.amazonaws.com/amazon-eks/1.31.4/2025-01-10/bin/darwin/amd64/kubectl

[cloudshell-user@ip-10-2-84-204 ~]$ aws s3 cp kubectl s3://my-bucket/kubectl-1.31.4
upload: ./kubectl to s3://my-bucket/kubectl-1.31.4
```

## Accessing the EKS cluster with kubectl
To access the EKS cluster, SSM to the `kubectl-client` instance

Update the kubeconfig. Get the settings from the `cdk deploy` output you noted earlier.

```
[ssm-user@ip-10-0-0-240 bin]$ aws eks update-kubeconfig --name eks-private --region ap-southeast-1 --role-arn arn:aws:iam::111111111111:role/EksPrivateCluster-clusteradminxxxxxxxx-xxxxxxxxxxxx
Added new context arn:aws:eks:ap-southeast-1:111111111111:cluster/eks-private to /home/ssm-user/.kube/config
```

Test the access to the EKS cluster. Get pods and nodes

```
[ssm-user@ip-10-0-0-240 ~]$ kubectl get nodes
NAME                                           STATUS   ROLES    AGE   VERSION
ip-10-0-0-60.ap-southeast-1.compute.internal   Ready    <none>   19h   v1.31.0-eks-a737599

[ssm-user@ip-10-0-0-240 ~]$ kubectl get pods -A
NAMESPACE     NAME                       READY   STATUS    RESTARTS        AGE
kube-system   aws-node-9sqcb             2/2     Running   2 (4h39m ago)   19h
kube-system   coredns-6787556b84-cg29g   1/1     Running   1 (4h39m ago)   19h
kube-system   coredns-6787556b84-q98ks   1/1     Running   1 (4h39m ago)   19h
kube-system   kube-proxy-m9ms4           1/1     Running   1 (4h39m ago)   19h
```

## Cleanup
```
cdk destroy
```
