package addons

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awseks"
	"github.com/aws/jsii-runtime-go"
)

// AWS Node Termination Handler
func NewEksNodeTerminationHandler(stack awscdk.Stack, cluster awseks.Cluster) {
	// https://github.com/aws/aws-node-termination-handler/tree/main/config/helm/aws-node-termination-handler
	awseks.NewHelmChart(stack, jsii.String("NodeTerminationHandlerChart"), &awseks.HelmChartProps{
		Repository: jsii.String("https://aws.github.io/eks-charts"),
		Release:    jsii.String("aws-node-termination-handler"),
		Cluster:    cluster,
		Chart:      jsii.String("aws-node-termination-handler"),
		Namespace:  jsii.String("kube-system"),
		Wait:       jsii.Bool(true),
		Version:    jsii.String("0.18.0"),
		Values: &map[string]interface{}{
			"enableSpotInterruptionDraining": jsii.Bool(true),
			"enableRebalanceMonitoring":      jsii.Bool(true),
			"enableScheduledEventDraining":   jsii.Bool(false),
		},
	})
}
