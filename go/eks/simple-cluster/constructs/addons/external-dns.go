package addons

import (
	"simple-cluster/config"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awseks"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
	"github.com/aws/jsii-runtime-go"
)

// Install ExternalDNS
// https://github.com/kubernetes-sigs/external-dns
func NewEksExternalDNS(stack awscdk.Stack, cluster awseks.Cluster) {
	externalDnsRole := config.ExternalDnsRole(stack)

	var externalDnsPolicy awsiam.PolicyDocument
	// If the 'cdk.json/context/externalDnsRole' is not empty, we need to define a policy to assume that target role.
	if len(externalDnsRole) > 0 {
		externalDnsPolicy = awsiam.NewPolicyDocument(&awsiam.PolicyDocumentProps{
			AssignSids: jsii.Bool(true),
			Statements: &[]awsiam.PolicyStatement{
				awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
					Effect: awsiam.Effect_ALLOW,
					Actions: &[]*string{
						jsii.String("sts:AssumeRole"),
					},
					Resources: &[]*string{
						jsii.String(externalDnsRole),
					},
				}),
			},
		})
	} else { // Otherwise, we define a policy with the corresponding permissions.
		externalDnsPolicy = awsiam.NewPolicyDocument(&awsiam.PolicyDocumentProps{
			AssignSids: jsii.Bool(true),
			Statements: &[]awsiam.PolicyStatement{
				awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
					Effect: awsiam.Effect_ALLOW,
					Actions: &[]*string{
						jsii.String("route53:ChangeResourceRecordSets"),
					},
					Resources: &[]*string{
						jsii.String("arn:aws:route53:::hostedzone/*"),
					},
				}),
				awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
					Effect: awsiam.Effect_ALLOW,
					Actions: &[]*string{
						jsii.String("route53:ListHostedZones"),
						jsii.String("route53:ListResourceRecordSets"),
					},
					Resources: &[]*string{
						jsii.String("*"),
					},
				}),
			},
		})
	}

	// Create K8s service account in default namespace.
	externalDnsSa := awseks.NewServiceAccount(stack, jsii.String("ExternalDNSSA"), &awseks.ServiceAccountProps{
		Name:      jsii.String("external-dns"),
		Cluster:   cluster,
		Namespace: jsii.String("kube-system"),
	})

	// Associate the policy with that service account.
	awsiam.NewPolicy(stack, jsii.String("ExternalDNSPolicy"), &awsiam.PolicyProps{
		Document:   externalDnsPolicy,
		PolicyName: jsii.String(*stack.StackName() + "-ExternalDNSPolicy"),
		Roles: &[]awsiam.IRole{
			externalDnsSa.Role(),
		},
	})

	// If your ExternalDNS cross account access role. You need to update the target role's Principal of trust policy with this ARN
	awscdk.NewCfnOutput(stack, jsii.String("externalDNSRoleArn"), &awscdk.CfnOutputProps{
		Value: externalDnsSa.Role().RoleArn(),
	})

	// https://github.com/bitnami/charts/tree/master/bitnami/external-dns
	externalDnsChart := awseks.NewHelmChart(stack, jsii.String("ExternalDNSChart"), &awseks.HelmChartProps{
		Repository:      jsii.String("https://charts.bitnami.com/bitnami"),
		Release:         jsii.String("external-dns"),
		Cluster:         cluster,
		Chart:           jsii.String("external-dns"),
		Namespace:       jsii.String("kube-system"),
		CreateNamespace: jsii.Bool(true),
		Wait:            jsii.Bool(true),
		Version:         jsii.String("6.2.3"),
		Values: &map[string]interface{}{
			"provider": jsii.String("aws"),
			"policy":   jsii.String("sync"),
			"serviceAccount": map[string]interface{}{
				"create": jsii.Bool(false),
				"name":   externalDnsSa.ServiceAccountName(),
			},
			"aws": map[string]interface{}{
				"assumeRoleArn": jsii.String(externalDnsRole),
			},
		},
	})
	externalDnsChart.Node().AddDependency(externalDnsSa)
}
