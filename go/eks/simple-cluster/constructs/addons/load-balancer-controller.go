package addons

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awseks"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
	"github.com/aws/jsii-runtime-go"
)

// Install AWS Load Balancer Controller
// https://docs.aws.amazon.com/eks/latest/userguide/aws-load-balancer-controller.html
func NewEksLoadBalancerController(stack awscdk.Stack, cluster awseks.Cluster) {
	// Create IAM Policy for AWS Load Balancer Controller
	lbcPolicy := awsiam.NewPolicyDocument(&awsiam.PolicyDocumentProps{
		AssignSids: jsii.Bool(true),
		Statements: &[]awsiam.PolicyStatement{
			awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
				Effect: awsiam.Effect_ALLOW,
				Actions: &[]*string{
					jsii.String("iam:CreateServiceLinkedRole"),
				},
				Resources: &[]*string{
					jsii.String("*"),
				},
				Conditions: &map[string]interface{}{
					"StringEquals": awscdk.NewCfnJson(stack, jsii.String("CfnJson-LBC-S0"), &awscdk.CfnJsonProps{
						Value: map[string]string{
							"iam:AWSServiceName": "elasticloadbalancing.amazonaws.com",
						},
					}),
				},
			}),
			awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
				Effect: awsiam.Effect_ALLOW,
				Actions: &[]*string{
					jsii.String("ec2:DescribeAccountAttributes"),
					jsii.String("ec2:DescribeAddresses"),
					jsii.String("ec2:DescribeAvailabilityZones"),
					jsii.String("ec2:DescribeInternetGateways"),
					jsii.String("ec2:DescribeVpcs"),
					jsii.String("ec2:DescribeVpcPeeringConnections"),
					jsii.String("ec2:DescribeSubnets"),
					jsii.String("ec2:DescribeSecurityGroups"),
					jsii.String("ec2:DescribeInstances"),
					jsii.String("ec2:DescribeNetworkInterfaces"),
					jsii.String("ec2:DescribeTags"),
					jsii.String("ec2:GetCoipPoolUsage"),
					jsii.String("ec2:DescribeCoipPools"),
					jsii.String("elasticloadbalancing:DescribeLoadBalancers"),
					jsii.String("elasticloadbalancing:DescribeLoadBalancerAttributes"),
					jsii.String("elasticloadbalancing:DescribeListeners"),
					jsii.String("elasticloadbalancing:DescribeListenerCertificates"),
					jsii.String("elasticloadbalancing:DescribeSSLPolicies"),
					jsii.String("elasticloadbalancing:DescribeRules"),
					jsii.String("elasticloadbalancing:DescribeTargetGroups"),
					jsii.String("elasticloadbalancing:DescribeTargetGroupAttributes"),
					jsii.String("elasticloadbalancing:DescribeTargetHealth"),
					jsii.String("elasticloadbalancing:DescribeTags"),
				},
				Resources: &[]*string{
					jsii.String("*"),
				},
			}),
			awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
				Effect: awsiam.Effect_ALLOW,
				Actions: &[]*string{
					jsii.String("cognito-idp:DescribeUserPoolClient"),
					jsii.String("acm:ListCertificates"),
					jsii.String("acm:DescribeCertificate"),
					jsii.String("iam:ListServerCertificates"),
					jsii.String("iam:GetServerCertificate"),
					jsii.String("waf-regional:GetWebACL"),
					jsii.String("waf-regional:GetWebACLForResource"),
					jsii.String("waf-regional:AssociateWebACL"),
					jsii.String("waf-regional:DisassociateWebACL"),
					jsii.String("wafv2:GetWebACL"),
					jsii.String("wafv2:GetWebACLForResource"),
					jsii.String("wafv2:AssociateWebACL"),
					jsii.String("wafv2:DisassociateWebACL"),
					jsii.String("shield:GetSubscriptionState"),
					jsii.String("shield:DescribeProtection"),
					jsii.String("shield:CreateProtection"),
					jsii.String("shield:DeleteProtection"),
				},
				Resources: &[]*string{
					jsii.String("*"),
				},
			}),
			awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
				Effect: awsiam.Effect_ALLOW,
				Actions: &[]*string{
					jsii.String("ec2:AuthorizeSecurityGroupIngress"),
					jsii.String("ec2:RevokeSecurityGroupIngress"),
				},
				Resources: &[]*string{
					jsii.String("*"),
				},
			}),
			awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
				Effect: awsiam.Effect_ALLOW,
				Actions: &[]*string{
					jsii.String("ec2:CreateSecurityGroup"),
				},
				Resources: &[]*string{
					jsii.String("*"),
				},
			}),
			awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
				Effect: awsiam.Effect_ALLOW,
				Actions: &[]*string{
					jsii.String("ec2:CreateTags"),
				},
				Resources: &[]*string{
					jsii.String("arn:aws:ec2:*:*:security-group/*"),
				},
				Conditions: &map[string]interface{}{
					"StringEquals": awscdk.NewCfnJson(stack, jsii.String("CfnJson-LBC-S1"), &awscdk.CfnJsonProps{
						Value: map[string]string{
							"ec2:CreateAction": "CreateSecurityGroup",
						},
					}),
					"Null": awscdk.NewCfnJson(stack, jsii.String("CfnJson-LBC-S2"), &awscdk.CfnJsonProps{
						Value: map[string]string{
							"aws:RequestTag/elbv2.k8s.aws/cluster": "false",
						},
					}),
				},
			}),
			awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
				Effect: awsiam.Effect_ALLOW,
				Actions: &[]*string{
					jsii.String("ec2:CreateTags"),
					jsii.String("ec2:DeleteTags"),
				},
				Resources: &[]*string{
					jsii.String("arn:aws:ec2:*:*:security-group/*"),
				},
				Conditions: &map[string]interface{}{
					"Null": awscdk.NewCfnJson(stack, jsii.String("CfnJson-LBC-S3"), &awscdk.CfnJsonProps{
						Value: map[string]string{
							"aws:RequestTag/elbv2.k8s.aws/cluster":  "true",
							"aws:ResourceTag/elbv2.k8s.aws/cluster": "false",
						},
					}),
				},
			}),
			awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
				Effect: awsiam.Effect_ALLOW,
				Actions: &[]*string{
					jsii.String("ec2:AuthorizeSecurityGroupIngress"),
					jsii.String("ec2:RevokeSecurityGroupIngress"),
					jsii.String("ec2:DeleteSecurityGroup"),
				},
				Resources: &[]*string{
					jsii.String("*"),
				},
				Conditions: &map[string]interface{}{
					"Null": awscdk.NewCfnJson(stack, jsii.String("CfnJson-LBC-S4"), &awscdk.CfnJsonProps{
						Value: map[string]string{
							"aws:ResourceTag/elbv2.k8s.aws/cluster": "false",
						},
					}),
				},
			}),
			awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
				Effect: awsiam.Effect_ALLOW,
				Actions: &[]*string{
					jsii.String("elasticloadbalancing:CreateLoadBalancer"),
					jsii.String("elasticloadbalancing:CreateTargetGroup"),
				},
				Resources: &[]*string{
					jsii.String("*"),
				},
				Conditions: &map[string]interface{}{
					"Null": awscdk.NewCfnJson(stack, jsii.String("CfnJson-LBC-S5"), &awscdk.CfnJsonProps{
						Value: map[string]string{
							"aws:RequestTag/elbv2.k8s.aws/cluster": "false",
						},
					}),
				},
			}),
			awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
				Effect: awsiam.Effect_ALLOW,
				Actions: &[]*string{
					jsii.String("elasticloadbalancing:CreateListener"),
					jsii.String("elasticloadbalancing:DeleteListener"),
					jsii.String("elasticloadbalancing:CreateRule"),
					jsii.String("elasticloadbalancing:DeleteRule"),
				},
				Resources: &[]*string{
					jsii.String("*"),
				},
			}),
			awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
				Effect: awsiam.Effect_ALLOW,
				Actions: &[]*string{
					jsii.String("elasticloadbalancing:AddTags"),
					jsii.String("elasticloadbalancing:RemoveTags"),
				},
				Resources: &[]*string{
					jsii.String("arn:aws:elasticloadbalancing:*:*:targetgroup/*/*"),
					jsii.String("arn:aws:elasticloadbalancing:*:*:loadbalancer/net/*/*"),
					jsii.String("arn:aws:elasticloadbalancing:*:*:loadbalancer/app/*/*"),
				},
				Conditions: &map[string]interface{}{
					"Null": awscdk.NewCfnJson(stack, jsii.String("CfnJson-LBC-S6"), &awscdk.CfnJsonProps{
						Value: map[string]string{
							"aws:RequestTag/elbv2.k8s.aws/cluster":  "true",
							"aws:ResourceTag/elbv2.k8s.aws/cluster": "false",
						},
					}),
				},
			}),
			awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
				Effect: awsiam.Effect_ALLOW,
				Actions: &[]*string{
					jsii.String("elasticloadbalancing:AddTags"),
					jsii.String("elasticloadbalancing:RemoveTags"),
				},
				Resources: &[]*string{
					jsii.String("arn:aws:elasticloadbalancing:*:*:listener/net/*/*/*"),
					jsii.String("arn:aws:elasticloadbalancing:*:*:listener/app/*/*/*"),
					jsii.String("arn:aws:elasticloadbalancing:*:*:listener-rule/net/*/*/*"),
					jsii.String("arn:aws:elasticloadbalancing:*:*:listener-rule/app/*/*/*"),
				},
			}),
			awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
				Effect: awsiam.Effect_ALLOW,
				Actions: &[]*string{
					jsii.String("elasticloadbalancing:ModifyLoadBalancerAttributes"),
					jsii.String("elasticloadbalancing:SetIpAddressType"),
					jsii.String("elasticloadbalancing:SetSecurityGroups"),
					jsii.String("elasticloadbalancing:SetSubnets"),
					jsii.String("elasticloadbalancing:DeleteLoadBalancer"),
					jsii.String("elasticloadbalancing:ModifyTargetGroup"),
					jsii.String("elasticloadbalancing:ModifyTargetGroupAttributes"),
					jsii.String("elasticloadbalancing:DeleteTargetGroup"),
				},
				Resources: &[]*string{
					jsii.String("*"),
				},
				Conditions: &map[string]interface{}{
					"Null": awscdk.NewCfnJson(stack, jsii.String("CfnJson-LBC-S7"), &awscdk.CfnJsonProps{
						Value: map[string]string{
							"aws:ResourceTag/elbv2.k8s.aws/cluster": "false",
						},
					}),
				},
			}),
			awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
				Effect: awsiam.Effect_ALLOW,
				Actions: &[]*string{
					jsii.String("elasticloadbalancing:RegisterTargets"),
					jsii.String("elasticloadbalancing:DeregisterTargets"),
				},
				Resources: &[]*string{
					jsii.String("arn:aws:elasticloadbalancing:*:*:targetgroup/*/*"),
				},
			}),
			awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
				Effect: awsiam.Effect_ALLOW,
				Actions: &[]*string{
					jsii.String("elasticloadbalancing:SetWebAcl"),
					jsii.String("elasticloadbalancing:ModifyListener"),
					jsii.String("elasticloadbalancing:AddListenerCertificates"),
					jsii.String("elasticloadbalancing:RemoveListenerCertificates"),
					jsii.String("elasticloadbalancing:ModifyRule"),
				},
				Resources: &[]*string{
					jsii.String("*"),
				},
			}),
		},
	})

	lbcSa := awseks.NewServiceAccount(stack, jsii.String("AWSLoadBalancerControllerSA"), &awseks.ServiceAccountProps{
		Name:      jsii.String("aws-load-balancer-controller"),
		Cluster:   cluster,
		Namespace: jsii.String("kube-system"),
	})

	awsiam.NewPolicy(stack, jsii.String("AWSLoadBalancerControllerPolicy"), &awsiam.PolicyProps{
		Document:   lbcPolicy,
		PolicyName: jsii.String(*stack.StackName() + "-AWSLoadBalancerControllerIAMPolicy"),
		Roles: &[]awsiam.IRole{
			lbcSa.Role(),
		},
	})

	// https://github.com/kubernetes-sigs/aws-load-balancer-controller/tree/main/helm/aws-load-balancer-controller
	// TODO: --set image.repository=
	// TODO: https://docs.aws.amazon.com/eks/latest/userguide/add-ons-images.html
	lbcChart := awseks.NewHelmChart(stack, jsii.String("AWSLoadBalancerControllerChart"), &awseks.HelmChartProps{
		Repository:      jsii.String("https://aws.github.io/eks-charts"),
		Release:         jsii.String("aws-load-balancer-controller"),
		Cluster:         cluster,
		Chart:           jsii.String("aws-load-balancer-controller"),
		Namespace:       jsii.String("kube-system"),
		CreateNamespace: jsii.Bool(true),
		Wait:            jsii.Bool(true),
		Version:         jsii.String("1.4.1"),
		Values: &map[string]interface{}{
			"clusterName": *cluster.ClusterName(),
			"defaultTags": map[string]string{
				"eks:cluster-name": *cluster.ClusterName(),
			},
			"region": jsii.String(*stack.Region()),
			"vpcId":  cluster.Vpc().VpcId(),
			"serviceAccount": map[string]interface{}{
				"create": jsii.Bool(false),
				"name":   lbcSa.ServiceAccountName(),
				/*
					"annotations": map[string]interface{}{
						"eks.amazonaws.com/sts-regional-endpoints": jsii.Bool(true),
					},
				*/
			},
		},
	})
	lbcChart.Node().AddDependency(lbcSa)
}
