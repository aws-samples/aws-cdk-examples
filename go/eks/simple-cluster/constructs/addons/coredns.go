package addons

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awseks"
	"github.com/aws/jsii-runtime-go"
)

// // Install CoreDNS add-on
func NewEksCoreDns(stack awscdk.Stack, cluster awseks.Cluster) {
	awseks.NewCfnAddon(stack, jsii.String("CoreDNSAddon"), &awseks.CfnAddonProps{
		AddonName:        jsii.String("coredns"),
		ResolveConflicts: jsii.String("OVERWRITE"),
		ClusterName:      cluster.ClusterName(),
		AddonVersion:     jsii.String("v1.8.4-eksbuild.1"),
	})
}
