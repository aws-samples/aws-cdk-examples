package addons

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awseks"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
	"github.com/aws/jsii-runtime-go"
)

// Install EBS CSI driver
func NewEksEbsCsiDriver(stack awscdk.Stack, cluster awseks.Cluster) {
	// Create IAM Policy for EBS CSI driver
	ebsCsiPolicy := awsiam.NewPolicyDocument(&awsiam.PolicyDocumentProps{
		AssignSids: jsii.Bool(true),
		Statements: &[]awsiam.PolicyStatement{
			awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
				Effect: awsiam.Effect_ALLOW,
				Actions: &[]*string{
					jsii.String("ec2:CreateSnapshot"),
					jsii.String("ec2:AttachVolume"),
					jsii.String("ec2:DetachVolume"),
					jsii.String("ec2:ModifyVolume"),
					jsii.String("ec2:DescribeAvailabilityZones"),
					jsii.String("ec2:DescribeInstances"),
					jsii.String("ec2:DescribeSnapshots"),
					jsii.String("ec2:DescribeTags"),
					jsii.String("ec2:DescribeVolumes"),
					jsii.String("ec2:DescribeVolumesModifications"),
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
					jsii.String("arn:aws:ec2:*:*:volume/*"),
					jsii.String("arn:aws:ec2:*:*:snapshot/*"),
				},
				Conditions: &map[string]interface{}{
					"StringEquals": awscdk.NewCfnJson(stack, jsii.String("CfnJson-EBSCSI-S0"), &awscdk.CfnJsonProps{
						Value: map[string][]string{
							"ec2:CreateAction": {
								"CreateVolume",
								"CreateSnapshot",
							},
						},
					}),
				},
			}),
			awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
				Effect: awsiam.Effect_ALLOW,
				Actions: &[]*string{
					jsii.String("ec2:DeleteTags"),
				},
				Resources: &[]*string{
					jsii.String("arn:aws:ec2:*:*:volume/*"),
					jsii.String("arn:aws:ec2:*:*:snapshot/*"),
				},
			}),
			awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
				Effect: awsiam.Effect_ALLOW,
				Actions: &[]*string{
					jsii.String("ec2:CreateVolume"),
				},
				Resources: &[]*string{
					jsii.String("*"),
				},
				Conditions: &map[string]interface{}{
					"StringLike": awscdk.NewCfnJson(stack, jsii.String("CfnJson-EBSCSI-S1"), &awscdk.CfnJsonProps{
						Value: map[string]string{
							"aws:RequestTag/ebs.csi.aws.com/cluster": "true",
						},
					}),
				},
			}),
			awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
				Effect: awsiam.Effect_ALLOW,
				Actions: &[]*string{
					jsii.String("ec2:CreateVolume"),
				},
				Resources: &[]*string{
					jsii.String("*"),
				},
				Conditions: &map[string]interface{}{
					"StringLike": awscdk.NewCfnJson(stack, jsii.String("CfnJson-EBSCSI-S2"), &awscdk.CfnJsonProps{
						Value: map[string]string{
							"aws:RequestTag/CSIVolumeName": "*",
						},
					}),
				},
			}),
			awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
				Effect: awsiam.Effect_ALLOW,
				Actions: &[]*string{
					jsii.String("ec2:CreateVolume"),
				},
				Resources: &[]*string{
					jsii.String("*"),
				},
				Conditions: &map[string]interface{}{
					"StringLike": awscdk.NewCfnJson(stack, jsii.String("CfnJson-EBSCSI-S3"), &awscdk.CfnJsonProps{
						Value: map[string]string{
							"aws:RequestTag/kubernetes.io/cluster/*": "owned",
						},
					}),
				},
			}),
			awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
				Effect: awsiam.Effect_ALLOW,
				Actions: &[]*string{
					jsii.String("ec2:DeleteVolume"),
				},
				Resources: &[]*string{
					jsii.String("*"),
				},
				Conditions: &map[string]interface{}{
					"StringLike": awscdk.NewCfnJson(stack, jsii.String("CfnJson-EBSCSI-S4"), &awscdk.CfnJsonProps{
						Value: map[string]string{
							"ec2:ResourceTag/ebs.csi.aws.com/cluster": "true",
						},
					}),
				},
			}),
			awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
				Effect: awsiam.Effect_ALLOW,
				Actions: &[]*string{
					jsii.String("ec2:DeleteVolume"),
				},
				Resources: &[]*string{
					jsii.String("*"),
				},
				Conditions: &map[string]interface{}{
					"StringLike": awscdk.NewCfnJson(stack, jsii.String("CfnJson-EBSCSI-S5"), &awscdk.CfnJsonProps{
						Value: map[string]string{
							"ec2:ResourceTag/CSIVolumeName": "*",
						},
					}),
				},
			}),
			awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
				Effect: awsiam.Effect_ALLOW,
				Actions: &[]*string{
					jsii.String("ec2:DeleteVolume"),
				},
				Resources: &[]*string{
					jsii.String("*"),
				},
				Conditions: &map[string]interface{}{
					"StringLike": awscdk.NewCfnJson(stack, jsii.String("CfnJson-EBSCSI-S6"), &awscdk.CfnJsonProps{
						Value: map[string]string{
							"ec2:ResourceTag/kubernetes.io/cluster/*": "owned",
						},
					}),
				},
			}),
			awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
				Effect: awsiam.Effect_ALLOW,
				Actions: &[]*string{
					jsii.String("ec2:DeleteSnapshot"),
				},
				Resources: &[]*string{
					jsii.String("*"),
				},
				Conditions: &map[string]interface{}{
					"StringLike": awscdk.NewCfnJson(stack, jsii.String("CfnJson-EBSCSI-S7"), &awscdk.CfnJsonProps{
						Value: map[string]string{
							"ec2:ResourceTag/CSIVolumeSnapshotName": "*",
						},
					}),
				},
			}),
			awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
				Effect: awsiam.Effect_ALLOW,
				Actions: &[]*string{
					jsii.String("ec2:DeleteSnapshot"),
				},
				Resources: &[]*string{
					jsii.String("*"),
				},
				Conditions: &map[string]interface{}{
					"StringLike": awscdk.NewCfnJson(stack, jsii.String("CfnJson-EBSCSI-S8"), &awscdk.CfnJsonProps{
						Value: map[string]string{
							"ec2:ResourceTag/ebs.csi.aws.com/cluster": "true",
						},
					}),
				},
			}),
		},
	})

	// For arm64/aarch64 cluster
	/*
		ebsCsiSa := awseks.NewServiceAccount(stack, jsii.String("EBSCSIDriverSA"), &awseks.ServiceAccountProps{
			Name:      jsii.String("ebs-csi-controller-sa"),
			Cluster:   cluster,
			Namespace: jsii.String("kube-system"),
		})

		awsiam.NewPolicy(stack, jsii.String("EBSCSIDriverPolicy"), &awsiam.PolicyProps{
			Document:   ebsCsiPolicy,
			PolicyName: jsii.String(*stack.StackName() + "-AmazonEKS_EBS_CSI_Driver_Policy"),
			Roles: &[]awsiam.IRole{
				ebsCsiSa.Role(),
			},
		})

		// https://github.com/kubernetes-sigs/aws-ebs-csi-driver/tree/master/charts/aws-ebs-csi-driver
		ebsCsiChart := awseks.NewHelmChart(stack, jsii.String("EBSCSIDriverChart"), &awseks.HelmChartProps{
			Repository:      jsii.String("https://kubernetes-sigs.github.io/aws-ebs-csi-driver"),
			Release:         jsii.String("aws-ebs-csi-driver"),
			Cluster:         cluster,
			Chart:           jsii.String("aws-ebs-csi-driver"),
			Namespace:       jsii.String("kube-system"),
			CreateNamespace: jsii.Bool(true),
			Wait:            jsii.Bool(true),
			Version:         jsii.String("2.6.4"),
			Values: &map[string]interface{}{
				"controller": map[string]map[string]interface{}{
					"serviceAccount": {
						"create": jsii.Bool(false),
						"name":   ebsCsiSa.ServiceAccountName(),
					},
					"extraVolumeTags": {
						"eks:cluster-name": cluster.ClusterName(),
					},
				},
			},
		})
		ebsCsiChart.Node().AddDependency(ebsCsiSa)
	*/

	// For x86_64/amd64 cluster
	ebsCsiRole := awsiam.NewRole(stack, jsii.String("EBSCSIDriverRole"), &awsiam.RoleProps{
		RoleName: jsii.String(*stack.StackName() + "-" + *stack.Region() + "-AmazonEKSEBSCSIRole"),
		AssumedBy: awsiam.NewWebIdentityPrincipal(cluster.OpenIdConnectProvider().OpenIdConnectProviderArn(), &map[string]interface{}{
			"StringEquals": awscdk.NewCfnJson(stack, jsii.String("CfnJson-EBSCSIDriverRole"), &awscdk.CfnJsonProps{
				Value: map[string]string{
					*cluster.OpenIdConnectProvider().OpenIdConnectProviderIssuer() + ":sub": "system:serviceaccount:kube-system:ebs-csi-controller-sa",
				},
			}),
		}),
		InlinePolicies: &map[string]awsiam.PolicyDocument{
			"AmazonEKS_EBS_CSI_Driver_Policy": ebsCsiPolicy,
		},
	})

	awseks.NewCfnAddon(stack, jsii.String("EBSCSIDriverAddon"), &awseks.CfnAddonProps{
		AddonName:             jsii.String("aws-ebs-csi-driver"),
		ClusterName:           cluster.ClusterName(),
		ServiceAccountRoleArn: ebsCsiRole.RoleArn(),
		AddonVersion:          jsii.String("v1.10.0-eksbuild.1"),
	})
}
