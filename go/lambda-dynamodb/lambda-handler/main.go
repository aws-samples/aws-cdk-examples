package main

import (
	"context"
	"log"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
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

	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		log.Fatalf("Got error loading config: %s", err)
	}

	svc := dynamodb.NewFromConfig(cfg)

	av, err := attributevalue.MarshalMap(event)
	if err != nil {
		log.Fatalf("Got error marshalling new movie item: %s", err)
	}

	tableName := "MyDynamoDB"

	input := &dynamodb.PutItemInput{
		Item:      av,
		TableName: aws.String(tableName),
	}

	_, err = svc.PutItem(ctx, input)
	if err != nil {
		log.Fatalf("Got error calling PutItem: %s", err)
	} else {
		log.Println("Successfully added '" + event.Message + "' to table " + tableName)
	}
}

func main() {
	lambda.Start(handleRequest)
}
