package main

import (
	"context"
	"fmt"
	"os"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/aws/aws-sdk-go-v2/service/rekognition"
	rekognitionTypes "github.com/aws/aws-sdk-go-v2/service/rekognition/types"
)

type Event struct {
	Records []struct {
		S3 struct {
			Object struct {
				Key string `json:"key"`
			} `json:"object"`
		} `json:"s3"`
	} `json:"Records"`
}

func handler(event Event) (*dynamodb.PutItemOutput, error) {
	// Load config
	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		panic(fmt.Errorf("unable to load SDK config, %v", err))
	}

	// Create clients
	dynamodbClient := dynamodb.NewFromConfig(cfg)
	rekognitionClient := rekognition.NewFromConfig(cfg)

	key := event.Records[0].S3.Object.Key

	// Detect labels in the image
	detectLabelsInput := &rekognition.DetectLabelsInput{
		Image: &rekognitionTypes.Image{
			S3Object: &rekognitionTypes.S3Object{
				Bucket: aws.String(os.Getenv("BUCKET_NAME")),
				Name:   aws.String(key),
			},
		},
		MaxLabels:     aws.Int32(10),
		MinConfidence: aws.Float32(70),
	}
	detectLabelsOutput, err := rekognitionClient.DetectLabels(context.TODO(), detectLabelsInput)
	if err != nil {
		panic(fmt.Errorf("unable to detect labels, %v", err))
	}

	// Get the list of labels
	labels := make([]string, 0, len(detectLabelsOutput.Labels))
	for _, label := range detectLabelsOutput.Labels {
		labels = append(labels, *label.Name)
	}
	fmt.Println(labels)

	// Write the image name and labels to DynamoDB
	tableName := os.Getenv("TABLE_NAME")
	putItemInput := &dynamodb.PutItemInput{
		TableName: aws.String(tableName),
		Item: map[string]types.AttributeValue{
			"image_name": &types.AttributeValueMemberS{Value: key},
			"labels":     &types.AttributeValueMemberS{Value: fmt.Sprintf("%v", labels)},
		},
		ConditionExpression: aws.String("attribute_not_exists(image_name)"),
	}
	output, err := dynamodbClient.PutItem(context.TODO(), putItemInput)
	if err != nil {
		panic(fmt.Errorf("unable to put item, %v", err))
	}
	return output, nil
}

func main() {
	lambda.Start(handler)
}
