package main

import (
	"encoding/json"
	"testing"

	"github.com/aws/aws-cdk-go/awscdk"
	"github.com/stretchr/testify/assert"
	"github.com/tidwall/gjson"
)

func TestHelloWorldStack(t *testing.T) {
	// GIVEN
	app := awscdk.NewApp(nil)

	// WHEN
	stack := NewHelloWorldStack(app, "MyStack", nil)

	// THEN
	bytes, err := json.Marshal(app.Synth(nil).GetStackArtifact(stack.ArtifactId()).Template())
	if err != nil {
		t.Error(err)
	}

	template := gjson.ParseBytes(bytes)

	// Check the bucket and make sure that it's properly named
	displayName := template.Get("Resources.MyS3C8F64D14.Properties.BucketName").String()
	assert.Equal(t, "my-happy-bucket-name", displayName)
}
