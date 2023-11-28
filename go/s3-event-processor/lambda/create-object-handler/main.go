package main

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

//Logs sqs messages in JSON format for optimal queries in CloudWatch
func logSqsMessage(message events.SQSMessage) {

	sqsBody := map[string]interface{}{}

	err := json.Unmarshal([]byte(message.Body), &sqsBody)
	if err != nil {
		panic(err)
	}

	event := map[string]interface{}{
		"message": "Received sqs message",
		"sqsBody": sqsBody,
	}

	eventJson, err := json.Marshal(event)
	if err != nil {
		panic(err)
	}

	fmt.Println(string(eventJson))
}

func handler(ctx context.Context, event events.SQSEvent) (events.SQSEventResponse, error) {

	for _, sqsMessage := range event.Records {
		logSqsMessage(sqsMessage)
	}

	return events.SQSEventResponse{}, nil
}

func main() {
	lambda.Start(handler)
}
