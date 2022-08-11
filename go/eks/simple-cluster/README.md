# EKS Simple Cluster

Demonstrate how to create an EKS cluster and manage related addons.

This example will automatically install the following K8s addons:
- vpc-cni
- kube-proxy
- coredns
- ebs-csi-driver
- metrics-server
- cluster-autoscaler
- aws-load-balancer-controller
- external-dns
- node-termination-handler
- aws-xray
- cloudwatch-agent
- fluent-bit-for-aws

## Prerequisites
1. Install and configure AWS CLI environment:<br />
   [Installation] - Installing or updating the latest version of the AWS CLI v2.<br />
   [Configuration] - Configure basic settings that AWS CLI uses to interact with AWS.<br />
   NOTE: Make sure your IAM User/Role has sufficient permissions.
2. Install Node Version Manager:<br />
   [Install NVM] - Install NVM and configure your environment according to this document.
3. Install Node.js:<br />
    ```sh
    nvm install 16.3.0
    ```
4. Install AWS CDK Toolkit:
    ```sh
    npm install -g aws-cdk
    ```
5. Install Golang:<br />
   [Download and Install] - Download and install Go quickly with the steps described here.
6. Install Docker:<br />
   [Install Docker Engine] - The installation section shows you how to install Docker on a variety of platforms.
7. Make sure you also have GNU Make, jq installed.

[Installation]: <https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html>
[Configuration]: <https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html>
[Install NVM]: <https://github.com/nvm-sh/nvm#install--update-script>
[Download and Install]: <https://go.dev/doc/install>
[Install Docker Engine]: <https://docs.docker.com/engine/install/>

## Configuration

You can edit the cdk.json file to modify the deployment configuration.

| Key | Example Value | Description |
| ------ | ------ | ------ |
| stackName | CDKGoExample-EKSCluster | CloudFormation stack name. |
| deploymentRegion | ap-northeast-1 | CloudFormation stack deployment region. If the value is empty, the default is the same as the region where deploy is executed. |
| targetArch | amd64/arm64 | Node archtecture type of EKS Nodegroup. The default EC2 instance size is c5.large/m6.large. |
| clusterName | CDKGoExample-EKSCluster | EKS cluster name. |
| keyPairName | my-key-pair | EC2 instance keypair of EKS Nodegroup. If the value is non-empty, the keypair MUST exist. |
| masterUsers | [Cow, Admin] | Master users in K8s system:masters group. All users listed here must be existing IAM Users. If the value is empty, you have to manually configure the local kubeconfig environment. |
| externalDnsRole | arn:aws:iam::123456789012:role/AWSAccount-EKSExternalDNSRole | IAM role in different AWS account. Cross-account access for K8s External-DNS addon. Please reference to config.go->func ExternalDnsRole for more information. |

## Deployment
Run the following command to deploy EKS cluster by CDK Toolkit:<br />
  ```sh
  cdk-cli-wrapper-dev.sh deploy
  ```
If all goes well, you will see the following output:<br />
  ```sh
  Stack ARN:
  arn:aws:cloudformation:ap-northeast-1:123456789012:stack/CdkGolangExample-CDKGoExample-EKSCluster-amd64/225b9050-a414-11ec-b5c2-0ab842e4df54
  
  ✨  Total time: 1987.1005s
  ```
You can also clean up the deployment by running command:<br />
  ```sh
  cdk-cli-wrapper-dev.sh destroy
  ```

## Output

After the deployment is complete, the EKS cluster information will be written to `cdk.out/cluster-info.json` file:<br />
| Name | Example Value |
| ------ | ------ |
| clusterSecurityGroupId | sg-0cb7ee5b03a23bb74 |
| apiServerEndpoint | https:<span>//AB123D8E12345CD123AA92855957B4F8.gr7.ap-northeast-1.eks.amazonaws.com |
| vpcId | vpc-0445143cc39ee48f6 |
| clusterName | CDKGoExample-EKSCluster |
| certificateAuthorityData | LS0tLS1CRUdJTi...BDRVJUSU0tCg== |
| kubectlRoleArn | arn:aws:iam::123456789012:role/CDKGoExample-EKSCluster-EksClusterCreationRole75AA-1UKOP8JQ8R9DN |
| region | ap-northeast-1 |
| oidcIdpArn | arn:aws:iam::123456789012:oidc-provider/oidc.eks.ap-northeast-1.amazonaws.com/id/AB123D8E12345CD123AA92855957B4F8 |

You can call `awseks.Cluster_FromClusterAttributes` to import this cluster in other CDK8s projects:<br />
   ```go
   type ClusterInfo struct {
      ClusterName              string `json:"clusterName"`
      ApiServerEndpoint        string `json:"apiServerEndpoint"`
      KubectlRoleArn           string `json:"kubectlRoleArn"`
      OidcIdpArn               string `json:"oidcIdpArn"`
      ClusterSecurityGroupId   string `json:"clusterSecurityGroupId"`
      Region                   string `json:"region"`
      VpcId                    string `json:"vpcId"`
      CertificateAuthorityData string `json:"certificateAuthorityData"`
   }
   
	clusterInfoFile, _ := ioutil.ReadFile("./cluster-info.json")
	clusterInfo := ClusterInfo{}
	json.Unmarshal(clusterInfoFile, &clusterInfo)

	// Import eks cluster.
	cluster := awseks.Cluster_FromClusterAttributes(stack, jsii.String("EKSCluster"), &awseks.ClusterAttributes{
		ClusterName:                     jsii.String(clusterInfo.ClusterName),
		ClusterCertificateAuthorityData: jsii.String(clusterInfo.CertificateAuthorityData),
		ClusterEndpoint:                 jsii.String(clusterInfo.ApiServerEndpoint),
		ClusterSecurityGroupId:          jsii.String(clusterInfo.ClusterSecurityGroupId),
		OpenIdConnectProvider:           awsiam.OpenIdConnectProvider_FromOpenIdConnectProviderArn(stack, jsii.String("idp"), jsii.String(clusterInfo.OidcIdpArn)),
		Vpc: awsec2.Vpc_FromLookup(stack, jsii.String("VPC"), &awsec2.VpcLookupOptions{
			IsDefault: jsii.Bool(false),
			Region:    jsii.String(clusterInfo.Region),
			VpcId:     jsii.String(clusterInfo.VpcId),
		}),
		KubectlRoleArn: jsii.String(clusterInfo.KubectlRoleArn),
	})
   ```
