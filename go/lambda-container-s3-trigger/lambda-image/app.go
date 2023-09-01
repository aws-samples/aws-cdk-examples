package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

type Event struct {
	Records []Record `json:"records"`
}

type Record struct {
	S3 S3 `json:"s3`
}

type S3 struct {
	Bucket Bucket `json:"bucket"`
	Object Object `json:"object"`
}

type Bucket struct {
	Name string
}

type Object struct {
	Key string
}

func lambdaHandler(ctx context.Context, event events.S3Event) (string, error) {
	eventJson, _ := json.Marshal(event)
	var data Event
	// To parse JSON data, you can unmarshal it into a struct or map[string]interface{}. Read more here https://gobyexample.com/json
	json.Unmarshal(eventJson, &data)
	bucket := data.Records[0].S3.Bucket.Name
	key := data.Records[0].S3.Object.Key
	msg := fmt.Sprintf("An object was uploaded to bucket %s with key %s", bucket, key)
	log.Print(msg)

	return msg, nil
}

func main() {
	lambda.Start(lambdaHandler)
}
