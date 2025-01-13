package main

import (
	"encoding/json"
	"testing"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/stretchr/testify/assert"
	"github.com/tidwall/gjson"
)

func TestClusterStack(t *testing.T) {
	// GIVEN
	app := awscdk.NewApp(nil)

	// WHEN
	stack := NewClusterStack(app, "TestStack", nil)

	// THEN
	bytes, err := json.Marshal(app.Synth(nil).GetStackArtifact(stack.ArtifactId()).Template())
	if err != nil {
		t.Error(err)
	}

	template := gjson.ParseBytes(bytes)
	assert.NotNil(t, template)

	// Cluster
	clusterVersion := template.Get("Resources.Cluster9EE0221C.Properties.Config.version").String()
	assert.Equal(t, "1.31", clusterVersion)

	ipFamily := template.Get("Resources.Cluster9EE0221C.Properties.Config.kubernetesNetworkConfig.ipFamily").String()
	assert.Equal(t, "ipv4", ipFamily)

	// Managed Node Group
	maxSize := template.Get("Resources.ClusterNodegroupcustomnodegroupF798ADA7.Properties.ScalingConfig.MaxSize").Int()
	assert.Equal(t, int64(5), maxSize)

	minSize := template.Get("Resources.ClusterNodegroupcustomnodegroupF798ADA7.Properties.ScalingConfig.MinSize").Int()
	assert.Equal(t, int64(2), minSize)

	desiredSize := template.Get("Resources.ClusterNodegroupcustomnodegroupF798ADA7.Properties.ScalingConfig.DesiredSize").Int()
	assert.Equal(t, int64(2), desiredSize)

	diskSize := template.Get("Resources.ClusterNodegroupcustomnodegroupF798ADA7.Properties.DiskSize").Int()
	assert.Equal(t, int64(100), diskSize)

	amiType := template.Get("Resources.ClusterNodegroupcustomnodegroupF798ADA7.Properties.AmiType").String()
	assert.Equal(t, "AL2023_ARM_64_STANDARD", amiType)

	// Fargate
	fargateProfileNamespace := template.Get("Resources.MyProfileC56205EE.Properties.Config.selectors.0.namespace").String()
	assert.Equal(t, "default", fargateProfileNamespace)

	// Addons
	addonNameKubeProxy := template.Get("Resources.CfnAddonKubeProxy.Properties.AddonName").String()
	assert.Equal(t, "kube-proxy", addonNameKubeProxy)

	addonNameVpcCni := template.Get("Resources.CfnAddonVpcCni.Properties.AddonName").String()
	assert.Equal(t, "vpc-cni", addonNameVpcCni)

	addonNameCoreDns := template.Get("Resources.CfnAddonCoreDns.Properties.AddonName").String()
	assert.Equal(t, "coredns", addonNameCoreDns)

	addonNameEksPodIdentityAgent := template.Get("Resources.CfnAddonEksPodIdentityAgent.Properties.AddonName").String()
	assert.Equal(t, "eks-pod-identity-agent", addonNameEksPodIdentityAgent)

	addonNameMetricsServer := template.Get("Resources.CfnAddonMetricsServer.Properties.AddonName").String()
	assert.Equal(t, "metrics-server", addonNameMetricsServer)

	// AWS Load Balancer Controller
	albRelease := template.Get("Resources.TestStackCluster8E857178AlbController95870509.Properties.Release").String()
	assert.Equal(t, "aws-load-balancer-controller", albRelease)
}
