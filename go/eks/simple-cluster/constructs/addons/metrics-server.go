package addons

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awseks"
	"github.com/aws/jsii-runtime-go"
)

// Install Metrics Server
func NewEksMetricsServer(stack awscdk.Stack, cluster awseks.Cluster) {
	// https://github.com/kubernetes-sigs/metrics-server/tree/master/charts/metrics-server
	awseks.NewHelmChart(stack, jsii.String("MetricsServerChart"), &awseks.HelmChartProps{
		Repository: jsii.String("https://kubernetes-sigs.github.io/metrics-server"),
		Release:    jsii.String("metrics-server"),
		Cluster:    cluster,
		Chart:      jsii.String("metrics-server"),
		Namespace:  jsii.String("kube-system"),
		Wait:       jsii.Bool(true),
		Version:    jsii.String("3.8.2"),
	})
}
