package main

import (
	"context"
	"fmt"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

type response struct {
	Message string `json:"greeting"`
}

func init() {
}

func handleRequest(ctx context.Context, event events.SQSEvent) {
	fmt.Println(event.Records[0].Body)
}

func main() {
	lambda.Start(handleRequest)
}
