package main

import (
	"encoding/json"
	"testing"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/stretchr/testify/assert"
	"github.com/tidwall/gjson"
	//"fmt"
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

	// Test for ALB
	albRelease := template.Get("Resources.TestStackCluster8E857178AlbController95870509.Properties.Release").String()
	assert.Equal(t, "aws-load-balancer-controller", albRelease)

	// Test for graviton instances
	nodeGroupType := template.Get("Resources.ClusterNodegroupcustomnodegroupF798ADA7.Properties.AmiType").String()
	assert.Equal(t, "AL2_ARM_64", nodeGroupType)
	instanceType := template.Get("Resources.ClusterNodegroupcustomnodegroupF798ADA7.Properties.InstanceTypes").String()
	assert.Equal(t, "[\"t4g.medium\"]", instanceType)
}
