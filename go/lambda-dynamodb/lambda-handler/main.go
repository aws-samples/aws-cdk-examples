package main

import (
	"context"
	"log"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
)

type Item struct {
	Message string
}

type MyEvent struct {
	ID      string `json:"ID"`
	Message string `json:"message"`
}

func init() {
}

func handleRequest(ctx context.Context, event MyEvent) {

	sess := session.Must(session.NewSessionWithOptions(session.Options{
		SharedConfigState: session.SharedConfigEnable,
	}))

	svc := dynamodb.New(sess)

	av, err := dynamodbattribute.MarshalMap(event)
	if err != nil {
		log.Fatalf("Got error marshalling new movie item: %s", err)
	}

	tableName := "MyDynamoDB"

	input := &dynamodb.PutItemInput{
		Item:      av,
		TableName: aws.String(tableName),
	}

	_, err = svc.PutItem(input)
	if err != nil {
		log.Fatalf("Got error calling PutItem: %s", err)
	} else {
		log.Println("Successfully added '" + event.Message + "' to table " + tableName)
	}
}

func main() {
	lambda.Start(handleRequest)
}
