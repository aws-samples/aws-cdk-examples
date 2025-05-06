package main

import (
	"log"
	"os"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsdynamodb"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
	"github.com/aws/aws-cdk-go/awscdk/v2/awslambda"
	"github.com/aws/aws-cdk-go/awscdk/v2/awss3"
	"github.com/aws/aws-cdk-go/awscdk/v2/awss3notifications"
	"github.com/aws/aws-cdk-go/awscdklambdagoalpha/v2"
	"github.com/aws/aws-sdk-go/aws"

	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

type RekognitionLambdaS3TriggerStackProps struct {
	awscdk.StackProps
}

func NewRekognitionLambdaS3TriggerStack(scope constructs.Construct, id string, props *RekognitionLambdaS3TriggerStackProps) awscdk.Stack {
	var sprops awscdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}
	_, err := os.Getwd()
	if err != nil {
		log.Println(err)
	}
	stack := awscdk.NewStack(scope, &id, &sprops)

	// Create S3 Bucket
	bucket := awss3.NewBucket(stack, aws.String("Bucket"), &awss3.BucketProps{
		RemovalPolicy: awscdk.RemovalPolicy_DESTROY,
	})

	// Create DynamoDb table
	table := awsdynamodb.NewTable(stack, aws.String("Classifications"), &awsdynamodb.TableProps{
		PartitionKey: &awsdynamodb.Attribute{
			Name: aws.String("image_name"),
			Type: awsdynamodb.AttributeType_STRING,
		},
		RemovalPolicy: awscdk.RemovalPolicy_DESTROY,
	})

	//Create Lambda function
	function := awscdklambdagoalpha.NewGoFunction(stack, jsii.String("main"), &awscdklambdagoalpha.GoFunctionProps{
		Runtime: awslambda.Runtime_PROVIDED_AL2023(),
		Entry:   jsii.String("./lambda-handler"),
		Bundling: &awscdklambdagoalpha.BundlingOptions{
			GoBuildFlags: jsii.Strings(`-ldflags "-s -w"`),
		},
		Environment: &map[string]*string{
			"BUCKET_NAME": bucket.BucketName(),
			"TABLE_NAME":  table.TableName(),
		},
	})

	statement := awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
		Actions:   &[]*string{jsii.String("rekognition:DetectLabels")},
		Resources: &[]*string{jsii.String("*")},
	})

	function.AddToRolePolicy(statement)

	//Add event notifications for bucket
	bucket.AddEventNotification(awss3.EventType_OBJECT_CREATED, awss3notifications.NewLambdaDestination(function), &awss3.NotificationKeyFilter{
		Suffix: jsii.String(".jpg"),
	})
	bucket.AddEventNotification(awss3.EventType_OBJECT_CREATED, awss3notifications.NewLambdaDestination(function), &awss3.NotificationKeyFilter{
		Suffix: jsii.String(".jpeg"),
	})
	bucket.AddEventNotification(awss3.EventType_OBJECT_CREATED, awss3notifications.NewLambdaDestination(function), &awss3.NotificationKeyFilter{
		Suffix: jsii.String(".png"),
	})

	table.GrantReadWriteData(function)
	bucket.GrantReadWrite(function, nil)

	// Create CloudFormation outputs
	awscdk.NewCfnOutput(stack, jsii.String("UploadImageToS3"), &awscdk.CfnOutputProps{
		Value:       jsii.Sprintf("aws s3 cp <local-path-to-image> s3://%s/", aws.StringValue(bucket.BucketName())),
		Description: jsii.String("Upload an image to S3 (using AWS CLI) to trigger Rekognition"),
	})
	awscdk.NewCfnOutput(stack, jsii.String("DynamoDBTable"), &awscdk.CfnOutputProps{
		Value:       table.TableName(),
		Description: jsii.String("This is where the image Rekognition results will be stored."),
	})
	awscdk.NewCfnOutput(stack, jsii.String("LambdaFunction"), &awscdk.CfnOutputProps{
		Value: function.FunctionName(),
	})
	awscdk.NewCfnOutput(stack, jsii.String("LambdaFunctionLogs"), &awscdk.CfnOutputProps{
		Value: function.LogGroup().LogGroupName(),
	})

	return stack
}

func main() {
	defer jsii.Close()

	app := awscdk.NewApp(nil)

	NewRekognitionLambdaS3TriggerStack(app, "RekognitionLambdaS3TriggerStack", &RekognitionLambdaS3TriggerStackProps{
		awscdk.StackProps{
			Env: env(),
		},
	})

	app.Synth(nil)
}

func env() *awscdk.Environment {
	return nil

}
