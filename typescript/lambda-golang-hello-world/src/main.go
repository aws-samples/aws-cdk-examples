package main

import (
	"fmt"
	"github.com/aws/aws-lambda-go/lambda"
)

type InputEvent struct {
	Name string `json:"name"`
}

type Response struct {
	StatusCode int `json:"statusCode"`
	Message string `json:"response"`
}

func HandleLambdaEvent(event InputEvent) (Response, error) {
	return Response{Message: fmt.Sprintf("Hello %s!", event.Name), StatusCode: 200}, nil
}

func main() {
	lambda.Start(HandleLambdaEvent)
}