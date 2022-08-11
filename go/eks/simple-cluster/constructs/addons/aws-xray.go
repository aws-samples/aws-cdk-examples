package addons

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awseks"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
	"github.com/aws/jsii-runtime-go"
)

// Install AWS X-Ray daemon
func NewEksAwsXray(stack awscdk.Stack, cluster awseks.Cluster) {
	xraySa := awseks.NewServiceAccount(stack, jsii.String("AWSXRaySA"), &awseks.ServiceAccountProps{
		Name:      jsii.String("aws-xray"),
		Cluster:   cluster,
		Namespace: jsii.String("kube-system"),
	})
	xraySa.Role().AddManagedPolicy(awsiam.ManagedPolicy_FromAwsManagedPolicyName(jsii.String("AWSXRayDaemonWriteAccess")))

	// https://artifacthub.io/packages/helm/okgolove/aws-xray
	caChart := awseks.NewHelmChart(stack, jsii.String("AWSXRayChart"), &awseks.HelmChartProps{
		Repository: jsii.String("https://okgolove.github.io/helm-charts"),
		Release:    jsii.String("aws-xray"),
		Cluster:    cluster,
		Chart:      jsii.String("aws-xray"),
		Namespace:  jsii.String("kube-system"),
		Wait:       jsii.Bool(true),
		Version:    jsii.String("3.4.0"),
		Values: &map[string]interface{}{
			"serviceAccount": map[string]interface{}{
				"create": jsii.Bool(false),
				"name":   xraySa.ServiceAccountName(),
			},
			"xray": map[string]interface{}{
				"region": stack.Region(),
			},
			"resources": map[string]map[string]interface{}{
				"requests": {
					"cpu":    jsii.String("256m"),
					"memory": jsii.String("32Mi"),
				},
				"limits": {
					"cpu":    jsii.String("512m"),
					"memory": jsii.String("64Mi"),
				},
			},
		},
	})
	caChart.Node().AddDependency(xraySa)
}
