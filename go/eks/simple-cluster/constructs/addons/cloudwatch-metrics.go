package addons

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awseks"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
	"github.com/aws/jsii-runtime-go"
)

// Install aws-cloudwatch-metrics, a CloudWatch Agent to Collect Cluster Metrics.
func NewEksCloudWatchMetrics(stack awscdk.Stack, cluster awseks.Cluster) {
	cwAgentSa := awseks.NewServiceAccount(stack, jsii.String("AWSCloudWatchAgentSA"), &awseks.ServiceAccountProps{
		Name:      jsii.String("cloudwatch-agent"),
		Cluster:   cluster,
		Namespace: jsii.String("kube-system"),
	})
	cwAgentSa.Role().AddManagedPolicy(awsiam.ManagedPolicy_FromAwsManagedPolicyName(jsii.String("CloudWatchAgentServerPolicy")))

	// https://github.com/aws/eks-charts/tree/master/stable/aws-cloudwatch-metrics
	awseks.NewHelmChart(stack, jsii.String("AWSCloudWatchAgentChart"), &awseks.HelmChartProps{
		Repository:      jsii.String("https://aws.github.io/eks-charts"),
		Release:         jsii.String("aws-cloudwatch-metrics"),
		Cluster:         cluster,
		Chart:           jsii.String("aws-cloudwatch-metrics"),
		Namespace:       jsii.String("kube-system"),
		CreateNamespace: jsii.Bool(true),
		Wait:            jsii.Bool(true),
		Version:         jsii.String("0.0.7"),
		Values: &map[string]interface{}{
			"clusterName": cluster.ClusterName(),
			"serviceAccount": map[string]interface{}{
				"create": jsii.Bool(false),
				"name":   cwAgentSa.ServiceAccountName(),
			},
		},
	})
}
