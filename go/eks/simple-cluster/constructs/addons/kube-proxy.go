package addons

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awseks"
	"github.com/aws/jsii-runtime-go"
)

// Install kube-proxy add-on
func NewEksKubeProxy(stack awscdk.Stack, cluster awseks.Cluster) {
	awseks.NewCfnAddon(stack, jsii.String("KubeProxyAddon"), &awseks.CfnAddonProps{
		AddonName:        jsii.String("kube-proxy"),
		ResolveConflicts: jsii.String("OVERWRITE"),
		ClusterName:      cluster.ClusterName(),
		AddonVersion:     jsii.String("v1.21.14-eksbuild.2"),
	})
}
