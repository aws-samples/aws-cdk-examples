package main

import (
	"encoding/json"
	"testing"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/stretchr/testify/assert"
	"github.com/tidwall/gjson"
)

func TestClassicLoadBalancerStack(t *testing.T) {
	// GIVEN
	app := awscdk.NewApp(nil)

	// WHEN
	stack := NewClassicLoadBalancerStack(app, "MyStack", nil)

	// THEN
	bytes, err := json.Marshal(app.Synth(nil).GetStackArtifact(stack.ArtifactId()).Template())
	if err != nil {
		t.Error(err)
	}

	template := gjson.ParseBytes(bytes)
	instancePort := template.Get("Resources.LB8A12904C.Properties.Listeners.0.InstancePort").String()
	assert.Equal(t, "80", instancePort)
}
