package addons

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awseks"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
	"github.com/aws/jsii-runtime-go"
)

// Install Cluster Autoscaler
func NewEksClusterAutoscaler(stack awscdk.Stack, cluster awseks.Cluster) {
	// Create IAM Policy for Cluster Autoscaler
	caPolicy := awsiam.NewPolicyDocument(&awsiam.PolicyDocumentProps{
		AssignSids: jsii.Bool(true),
		Statements: &[]awsiam.PolicyStatement{
			awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
				Effect: awsiam.Effect_ALLOW,
				Actions: &[]*string{
					jsii.String("autoscaling:DescribeAutoScalingGroups"),
					jsii.String("autoscaling:DescribeAutoScalingInstances"),
					jsii.String("autoscaling:DescribeLaunchConfigurations"),
					jsii.String("autoscaling:DescribeTags"),
					jsii.String("autoscaling:SetDesiredCapacity"),
					jsii.String("autoscaling:TerminateInstanceInAutoScalingGroup"),
					jsii.String("ec2:DescribeLaunchTemplateVersions"),
				},
				Resources: &[]*string{
					jsii.String("*"),
				},
			}),
		},
	})

	caSa := awseks.NewServiceAccount(stack, jsii.String("ClusterAutoscalerSA"), &awseks.ServiceAccountProps{
		Name:      jsii.String("cluster-autoscaler-sa"),
		Cluster:   cluster,
		Namespace: jsii.String("kube-system"),
	})

	awsiam.NewPolicy(stack, jsii.String("ClusterAutoscalerPolicy"), &awsiam.PolicyProps{
		Document:   caPolicy,
		PolicyName: jsii.String(*stack.StackName() + "-AmazonEKSClusterAutoscalerPolicy"),
		Roles: &[]awsiam.IRole{
			caSa.Role(),
		},
	})

	// https://github.com/kubernetes/autoscaler/tree/master/charts/cluster-autoscaler
	caChart := awseks.NewHelmChart(stack, jsii.String("ClusterAutoscalerChart"), &awseks.HelmChartProps{
		Repository: jsii.String("https://kubernetes.github.io/autoscaler"),
		Release:    jsii.String("cluster-autoscaler"),
		Cluster:    cluster,
		Chart:      jsii.String("cluster-autoscaler"),
		Namespace:  jsii.String("kube-system"),
		Wait:       jsii.Bool(true),
		Version:    jsii.String("9.13.1"),
		Values: &map[string]interface{}{
			"cloudProvider": jsii.String("aws"),
			"awsRegion":     jsii.String(*stack.Region()),
			"autoDiscovery": map[string]string{
				"clusterName": *cluster.ClusterName(),
			},
			"rbac": map[string]map[string]interface{}{
				"serviceAccount": {
					"create": jsii.Bool(false),
					"name":   caSa.ServiceAccountName(),
				},
			},
			"extraArgs": map[string]interface{}{
				"skip-nodes-with-system-pods":   jsii.Bool(false),
				"skip-nodes-with-local-storage": jsii.Bool(false),
				"balance-similar-node-groups":   jsii.Bool(true),
				// How long a node should be unneeded before it is eligible for scale down
				"scale-down-unneeded-time": jsii.String("300s"),
				// How long after scale up that scale down evaluation resumes
				"scale-down-delay-after-add": jsii.String("300s"),
				// selects the node group that will have the least idle CPU (if tied, unused memory) after scale-up.
				"expander": jsii.String("least-waste"),
			},
		},
	})
	caChart.Node().AddDependency(caSa)
}
