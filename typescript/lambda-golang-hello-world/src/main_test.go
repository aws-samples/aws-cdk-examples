package main

import (
	"testing"
)

func TestHandler(t *testing.T) {

	t.Run("Simple Unit Test", func(t *testing.T) {
		event := InputEvent{Name: "TestRunner"}
		response, _ := HandleLambdaEvent(event)
		if response.StatusCode != 200 {
			t.Fatal("Response code should be 200")
		}
		if response.Message != "Hello TestRunner!" {
			t.Fatal("Response message is incorrect")
		}
	})
}
