package addons

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awseks"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
	"github.com/aws/jsii-runtime-go"
)

// Install VPC CNI add-on
func NewEksVpcCni(stack awscdk.Stack, cluster awseks.Cluster) {
	cniRole := awsiam.NewRole(stack, jsii.String("VPCCNIRole"), &awsiam.RoleProps{
		RoleName: jsii.String(*stack.StackName() + "-" + *stack.Region() + "-AmazonEKSVPCCNIRole"),
		AssumedBy: awsiam.NewWebIdentityPrincipal(cluster.OpenIdConnectProvider().OpenIdConnectProviderArn(), &map[string]interface{}{
			"StringEquals": awscdk.NewCfnJson(stack, jsii.String("CfnJson-VPCCNIRole"), &awscdk.CfnJsonProps{
				Value: map[string]string{
					*cluster.OpenIdConnectProvider().OpenIdConnectProviderIssuer() + ":aud": "sts.amazonaws.com",
					*cluster.OpenIdConnectProvider().OpenIdConnectProviderIssuer() + ":sub": "system:serviceaccount:kube-system:aws-node",
				},
			}),
		}),
		ManagedPolicies: &[]awsiam.IManagedPolicy{
			awsiam.ManagedPolicy_FromAwsManagedPolicyName(jsii.String("AmazonEKS_CNI_Policy")),
		},
	})
	awseks.NewCfnAddon(stack, jsii.String("VPCCNIAddon"), &awseks.CfnAddonProps{
		AddonName:             jsii.String("vpc-cni"),
		ResolveConflicts:      jsii.String("OVERWRITE"),
		ClusterName:           cluster.ClusterName(),
		AddonVersion:          jsii.String("v1.11.2-eksbuild.1"),
		ServiceAccountRoleArn: cniRole.RoleArn(),
	})
}
