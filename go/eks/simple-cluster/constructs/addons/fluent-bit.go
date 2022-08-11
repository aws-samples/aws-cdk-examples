package addons

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awseks"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
	"github.com/aws/jsii-runtime-go"
)

// Install AWS for fluent bit.
func NewEksFluentBit(stack awscdk.Stack, cluster awseks.Cluster) {
	fbSa := awseks.NewServiceAccount(stack, jsii.String("FluentBitSA"), &awseks.ServiceAccountProps{
		Name:      jsii.String("fluent-bit"),
		Cluster:   cluster,
		Namespace: jsii.String("kube-system"),
	})
	fbSa.Role().AddManagedPolicy(awsiam.ManagedPolicy_FromAwsManagedPolicyName(jsii.String("CloudWatchAgentServerPolicy")))

	awsiam.NewPolicy(stack, jsii.String("FluentBitPolicy"), &awsiam.PolicyProps{
		PolicyName: jsii.String(*stack.StackName() + "-FluentBitPolicy"),
		Roles: &[]awsiam.IRole{
			fbSa.Role(),
		},
		Statements: &[]awsiam.PolicyStatement{
			awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
				Effect: awsiam.Effect_ALLOW,
				Actions: &[]*string{
					jsii.String("logs:PutRetentionPolicy"),
				},
				Resources: &[]*string{
					jsii.String("*"),
				},
			}),
		},
	})

	// https://github.com/aws/eks-charts/tree/master/stable/aws-for-fluent-bit
	awseks.NewHelmChart(stack, jsii.String("FluentBitChart"), &awseks.HelmChartProps{
		Repository:      jsii.String("https://aws.github.io/eks-charts"),
		Release:         jsii.String("aws-for-fluent-bit"),
		Cluster:         cluster,
		Chart:           jsii.String("aws-for-fluent-bit"),
		Namespace:       jsii.String("kube-system"),
		CreateNamespace: jsii.Bool(true),
		Wait:            jsii.Bool(true),
		Version:         jsii.String("0.1.15"),
		Values: &map[string]interface{}{
			"serviceAccount": map[string]interface{}{
				"create": jsii.Bool(false),
				"name":   fbSa.ServiceAccountName(),
			},
			"cloudWatch": map[string]interface{}{
				"enabled":          jsii.Bool(true),
				"match":            jsii.String("*"),
				"region":           stack.Region(),
				"logGroupName":     jsii.String("/aws/containerinsights/" + *cluster.ClusterName() + "/application"),
				"autoCreateGroup":  jsii.Bool(true),
				"logRetentionDays": jsii.Number(1),
			},
			"kinesis": map[string]interface{}{
				"enabled": jsii.Bool(false),
			},
			"firehose": map[string]interface{}{
				"enabled": jsii.Bool(false),
			},
			"elasticsearch": map[string]interface{}{
				"enabled": jsii.Bool(false),
			},
		},
	})
}
